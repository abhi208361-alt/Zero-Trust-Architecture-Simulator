from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User

def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

def get_audit_rows_for_range(db: Session, start: str | None = None, end: str | None = None) -> list[AuditLog]:
    start_dt = _parse_date(start)
    end_dt = _parse_date(end)

    query = db.query(AuditLog)
    if start_dt:
        query = query.filter(AuditLog.created_at >= start_dt)
    if end_dt:
        query = query.filter(AuditLog.created_at <= end_dt)
    return query.order_by(AuditLog.created_at.desc()).all()

def build_csv_report(db: Session, start: str | None = None, end: str | None = None) -> bytes:
    rows = get_audit_rows_for_range(db, start, end)
    output = io.StringIO()
    fieldnames = [
        "id",
        "created_at",
        "correlation_id",
        "event_type",
        "actor_id",
        "actor_username",
        "resource",
        "action",
        "result",
        "reason",
        "risk_score",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for row in rows:
        writer.writerow({
            "id": row.id,
            "created_at": row.created_at.isoformat() if row.created_at else "",
            "correlation_id": row.correlation_id,
            "event_type": row.event_type,
            "actor_id": row.actor_id,
            "resource": row.resource,
            "action": row.action,
            "result": row.result,
            "reason": row.reason,
            "risk_score": row.risk_score,
            "actor_username": row.actor_username or "",
        })

    return output.getvalue().encode("utf-8")

def build_pdf_report(db: Session, start: str | None = None, end: str | None = None) -> bytes:
    rows = get_audit_rows_for_range(db, start, end)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title="Zero Trust Audit Report")
    story = []

    story.append(Paragraph("Zero Trust Architecture Simulator"))
    story.append(Paragraph(f"Reporting period: {start or 'N/A'} to {end or 'N/A'}"))
    story.append(Spacer(1, 12))

    total = len(rows)
    allowed = sum(1 for r in rows if r.result == "allow")
    denied = sum(1 for r in rows if r.result == "deny")

    summary = [
        ["Metric", "Value"],
        ["Total events", str(total)],
        ["Allowed", str(allowed)],
        ["Denied", str(denied)],
    ]
    story.append(Table(summary, colWidths=[180, 120]))
    story.append(Spacer(1, 12))

    table_rows = [["Timestamp", "Event", "Actor", "Resource", "Result"]]
    for row in rows[:20]:
        table_rows.append([
            row.created_at.isoformat() if row.created_at else "",
            row.event_type,
            row.actor_username or "",
            row.resource,
            row.result,
        ])

    table = Table(table_rows, colWidths=[120, 120, 90, 100, 60])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f7fe8")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 1, colors.Color(0.25, 0.32, 0.42)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#102334"), colors.HexColor("#0d1e2d")]),
    ]))
    story.append(table)

    doc.build(story)
    return buffer.getvalue()