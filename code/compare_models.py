import sys
sys.path.insert(0, '/Users/josschaffers/EAISI-Group-Project---NHS/code')

import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, roc_auc_score, average_precision_score, confusion_matrix
import os

os.chdir('/Users/josschaffers/EAISI-Group-Project---NHS/code')

# Load data
X_test = pd.read_parquet('../data/cleaned/X_test_encoded_wo_provider.parquet')
y_test = pd.read_parquet('../data/cleaned/y_test.parquet').squeeze()
X_train = pd.read_parquet('../data/cleaned/X_train_encoded_wo_provider.parquet')
y_train = pd.read_parquet('../data/cleaned/y_train.parquet').squeeze()

# Load model
ebm_model = joblib.load('best_ebm_model.joblib')

# Get OKS T1 predictions
if 'oks_t1_score' in X_test.columns:
    oks_t1_threshold = X_test['oks_t1_score'].median()
    oks_t1_pred = (X_test['oks_t1_score'] >= oks_t1_threshold).astype(int).values
    oks_t1_pred_proba = X_test['oks_t1_score'].values / X_test['oks_t1_score'].max()
else:
    oks_subscales = [col for col in X_test.columns if 'oks' in col.lower() and 't1' in col.lower()]
    if len(oks_subscales) > 0:
        oks_t1_combined = X_test[oks_subscales].sum(axis=1)
        oks_t1_threshold = oks_t1_combined.median()
        oks_t1_pred = (oks_t1_combined >= oks_t1_threshold).astype(int).values
        oks_t1_pred_proba = oks_t1_combined.values / oks_t1_combined.max()

# Get EBM predictions
ebm_pred = ebm_model.predict(X_test)
ebm_pred_proba = ebm_model.predict_proba(X_test)[:, 1]

# Calculate metrics
ebm_precision = precision_score(y_test, ebm_pred)
ebm_recall = recall_score(y_test, ebm_pred)
ebm_f1 = f1_score(y_test, ebm_pred)
ebm_accuracy = accuracy_score(y_test, ebm_pred)
ebm_roc_auc = roc_auc_score(y_test, ebm_pred_proba)
ebm_pr_auc = average_precision_score(y_test, ebm_pred_proba)

oks_precision = precision_score(y_test, oks_t1_pred)
oks_recall = recall_score(y_test, oks_t1_pred)
oks_f1 = f1_score(y_test, oks_t1_pred)
oks_accuracy = accuracy_score(y_test, oks_t1_pred)
oks_roc_auc = roc_auc_score(y_test, oks_t1_pred_proba)
oks_pr_auc = average_precision_score(y_test, oks_t1_pred_proba)

# Print summary
print("="*80)
print("OKS T1 vs EBM MODEL COMPARISON - PERFORMANCE METRICS")
print("="*80)

print("\n📊 EBM Model Performance:")
print(f"  Accuracy:  {ebm_accuracy:.4f}")
print(f"  Precision: {ebm_precision:.4f}")
print(f"  Recall:    {ebm_recall:.4f}")
print(f"  F1-Score:  {ebm_f1:.4f}")
print(f"  ROC-AUC:   {ebm_roc_auc:.4f}")
print(f"  PR-AUC:    {ebm_pr_auc:.4f}")

print("\n📊 OKS T1 Model Performance:")
print(f"  Accuracy:  {oks_accuracy:.4f}")
print(f"  Precision: {oks_precision:.4f}")
print(f"  Recall:    {oks_recall:.4f}")
print(f"  F1-Score:  {oks_f1:.4f}")
print(f"  ROC-AUC:   {oks_roc_auc:.4f}")
print(f"  PR-AUC:    {oks_pr_auc:.4f}")

print("\n📈 Difference (EBM - OKS T1):")
print(f"  Accuracy:  {ebm_accuracy - oks_accuracy:+.4f}")
print(f"  Precision: {ebm_precision - oks_precision:+.4f}")
print(f"  Recall:    {ebm_recall - oks_recall:+.4f}")
print(f"  F1-Score:  {ebm_f1 - oks_f1:+.4f}")
print(f"  ROC-AUC:   {ebm_roc_auc - oks_roc_auc:+.4f}")
print(f"  PR-AUC:    {ebm_pr_auc - oks_pr_auc:+.4f}")

# Confusion matrices
print("\n🔲 Confusion Matrices:")
ebm_cm = confusion_matrix(y_test, ebm_pred)
oks_cm = confusion_matrix(y_test, oks_t1_pred)

print(f"\nEBM Model:")
print(f"  TN={ebm_cm[0, 0]:,}, FP={ebm_cm[0, 1]:,}")
print(f"  FN={ebm_cm[1, 0]:,}, TP={ebm_cm[1, 1]:,}")

print(f"\nOKS T1 Model:")
print(f"  TN={oks_cm[0, 0]:,}, FP={oks_cm[0, 1]:,}")
print(f"  FN={oks_cm[1, 0]:,}, TP={oks_cm[1, 1]:,}")

print("\n" + "="*80)
print("✓ Analysis complete!")
print("="*80)
