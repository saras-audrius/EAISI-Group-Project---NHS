# Import required libraries (add if not already imported)
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate

# Define SMOTE and Random Forest
smote = SMOTE(sampling_strategy='auto', random_state=42, k_neighbors=5)
rf_smote = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)

# Create pipeline
smote_rf_pipeline = ImbPipeline([
    ('smote', smote),
    ('classifier', rf_smote)
])

# Define cross-validation
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scoring = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'average_precision']

# Run cross-validation on clean features
cv_results_rf_smote = cross_validate(
    smote_rf_pipeline,
    X_train_clean,
    y_train,
    cv=cv,
    scoring=scoring,
    return_train_score=True
)

# Print results (similar to your existing code)
print("CROSS-VALIDATION RESULTS - RANDOM FOREST WITH SMOTE (5-FOLD)")
print("="*60)
for metric in ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'precision_recall_auc']:
    train_mean = cv_results_rf_smote[f'train_{metric}'].mean()
    val_mean = cv_results_rf_smote[f'test_{metric}'].mean()
    val_std = cv_results_rf_smote[f'test_{metric}'].std()
    print(f"{metric.upper():<20} {train_mean:.4f}   {val_mean:.4f} ± {val_std:.4f}")

# Fit on full training data for predictions (if needed)
smote_rf_pipeline.fit(X_train_clean, y_train)
y_pred_proba_rf_smote = smote_rf_pipeline.predict_proba(X_train_clean)[:, 1]