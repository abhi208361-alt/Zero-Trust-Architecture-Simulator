# Deprecation Tracker - Zero Trust Architecture Simulator

## Known Deprecations

### FastAPI on_event Deprecation (FastAPI 0.113+)

**Status**: ✅ Migrated to lifespan - completed in Phase 11
**File**: `app/main.py`
**Issue**: `@app.on_event("startup")` was deprecated in favor of FastAPI lifespan event handlers
**Impact**: None - application functions correctly; warning no longer appears in test output
**Likelihood**: High (FastAPI actively maintaining this deprecation)
**Impact**: Low (cosmetic warning only, no functional impact)
**Mitigation**: Migrated to `@app.lifespan` handler using `asynccontextmanager`

**Migration Completed**:
1. ✅ Replaced `on_event("startup")` with `lifespan=lifespan_app` parameter in FastAPI()
2. ✅ Created `lifespan_app()` async context manager function using `@asynccontextmanager`
3. ✅ Moved database initialization into async startup block
4. ✅ All 17 existing tests pass without lifespan-related errors
5. ✅ Deprecation warnings removed from test output

**Dependencies**:
- No additional packages required
- Test client now compatible with Starlette's lifespan protocol

**Priority**: Completed - cosmetic warning resolved
**Target Phase**: 11 (API Security Enhancements) - **DONE**

## Code Quality Issues

### Tracked Items
- [x] FastAPI on_event deprecation - migrated to lifespan in Phase 11 ✅
- [ ] Missing type hints on some route functions (Phase 12)
- [ ] Request validation could be more explicit (Phase 12)
- [ ] Error handling consistency (Phase 13)

### Code Health Score
- **Tests**: 17/17 passing ✅
- **Type hints**: Partial (core models have hints, some routes missing)
- **Documentation**: 11/11 docs files complete ✅
- **Security**: OWASP baseline covered, threat model complete ✅
- **Deployment**: Docker-ready ✅

## Next Code Quality Improvements (Phase 12)

### Planned
1. Add missing type hints to route functions in `app/api/routes.py`
2. Add Pydantic model validation where currently using raw dicts
3. Improve error response consistency across endpoints
4. Add request/response logging middleware
5. Add OpenAPI security scheme definitions

### Optional (Phase 13+)
- Full lifespan migration (already completed)
- Async support for long-running operations
- Background task processing for audit report generation