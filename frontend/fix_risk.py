with open(r'C:\Users\abhishek\OneDrive\Documents\ZERO-TRUST-ARCHITECTURE\Zero-Trust-Architecture-Simulator\frontend\src\pages\RiskAnalysisPage.txt', 'r', encoding='utf8') as f:
    content = f.read()
# Fix the headers line - replace triple/quadruple escaped quotes with proper JSX quotes
content = content.replace('headers={[\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"Risk Range\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"', 'headers={[\"Risk Range\", \"Count\"]}')
with open(r'C:\Users\abhishek\OneDrive\Documents\ZERO-TRUST-ARCHITECTURE\Zero-Trust-Architecture-Simulator\frontend\src\pages\RiskAnalysisPage.txt', 'w', encoding='utf8') as f:
    f.write(content)
print('Fixed RiskAnalysisPage')