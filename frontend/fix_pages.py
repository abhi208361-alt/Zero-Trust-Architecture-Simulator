import os
import shutil

# Replace RiskAnalysisPage.tsx with fixed version
src = r'C:\Users\abhishek\OneDrive\Documents\ZERO-TRUST-ARCHITECTURE\Zero-Trust-Architecture-Simulator\frontend\src\pages\RiskAnalysisPage_fixed.tsx'
dst = r'C:\Users\abhishek\OneDrive\Documents\ZERO-TRUST-ARCHITECTURE\Zero-Trust-Architecture-Simulator\frontend\src\pages\RiskAnalysisPage.txt'
shutil.copy2(src, dst)
print('RiskAnalysisPage fixed')

# Replace SecurityRulesPage.tsx with fixed version
src2 = r'C:\Users\abhishek\OneDrive\Documents\ZERO-TRUST-ARCHITECTURE\Zero-Trust-Architecture-Simulator\frontend\src\pages\SecurityRulesPage_fixed.tsx'
dst2 = r'C:\Users\abhishek\OneDrive\Documents\ZERO-TRUST-ARCHITECTURE\Zero-Trust-Architecture-Simulator\frontend\src\pages\SecurityRulesPage.txt'
shutil.copy2(src2, dst2)
print('SecurityRulesPage fixed')

# Clean up temp files
for f in [src, dst]:
    if os.path.exists(f):
        os.remove(f)
for f in [src2, dst2]:
    if os.path.exists(f):
        os.remove(f)
print('Done - temp files cleaned')