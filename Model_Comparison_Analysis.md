# Comparative Model Analysis: NHS OKS Prediction vs. Best EBM Model

## Executive Summary

This document compares two distinct approaches to predicting knee replacement outcomes:

1. **NHS Regression Model** - The pre-calculated "Knee Replacement OKS Post-Op Q Predicted" variable supplied in NHS PROMS data
2. **Best EBM Model** - An Explainable Boosting Machine (EBM) model trained on this project's data to predict good vs. poor patient outcomes

Both models address outcome prediction for total knee replacement, but they differ fundamentally in scope, methodology, and application.

---

## Model Comparison Matrix

| Aspect | NHS Regression Model | Best EBM Model |
|--------|---------------------|-----------------|
| **Model Type** | Regression | Classification (Binary) |
| **Output** | Continuous OKS Score (0-48 points) | Probability of good outcome (binary) |
| **Target Variable** | Absolute OKS at 6 months post-op | Improvement ≥7 points (≥1/7 of OKS scale) |
| **Developer** | NHS Digital PROMS Programme | Project team (this analysis) |
| **Interpretability** | Moderate (linear regression) | **High** (EBM inherently interpretable) |
| **Feature Input** | Pre-operative patient characteristics | ~45 pre-operative features + OKS baseline |
| **Model Complexity** | Linear/standard regression | Gradient boosting with additive explanations |
| **Training Data** | National NHS data (all regions/hospitals) | This project's cleaned dataset |
| **Validation Status** | Nationally validated (2013+) | Project-specific cross-validated |
| **Deployment Context** | Hospital quality benchmarking | Outcome prediction & patient stratification |

---

## Model Architecture & Methodology

### NHS Regression Model

**Approach:**
- Standard regression model (likely linear or generalized linear)
- Predicts continuous OKS T1 score at 6 months post-op
- Uses pre-operative covariates to adjust for case-mix variation
- Applied uniformly across NHS hospitals for benchmarking

**Strengths:**
- ✅ Nationally validated and deployed
- ✅ Transparent methodology (regression-based)
- ✅ Case-mix adjusted (accounts for patient heterogeneity)
- ✅ Continuous output allows fine-grained comparison
- ✅ Benchmarking standard established across NHS

**Limitations:**
- ❌ Regression assumes linear relationships
- ❌ Less explicit about feature interactions
- ❌ Requires pre-operative baseline OKS
- ❌ May not capture non-linear patterns in outcome prediction

---

### Best EBM Model

**Approach:**
- Explainable Boosting Machine (InterpretML/EBM)
- Binary classification: Good outcome (≥7 point improvement) vs. Poor outcome (<7 point improvement)
- Trained on preprocessed, fully-encoded dataset (45+ features)
- Captures non-linear relationships and feature interactions
- Uses gradient boosting with inherent interpretability constraints

**Strengths:**
- ✅ **Inherently interpretable** - per-feature contribution plots available
- ✅ Captures non-linear patterns in outcome prediction
- ✅ Handles complex feature interactions naturally
- ✅ Class-weighted to handle ~5:1 imbalance (good:poor outcomes)
- ✅ Feature importance directly shows clinical drivers
- ✅ Cross-validated on project data
- ✅ Modern machine learning approach

**Limitations:**
- ❌ Project-specific, not externally validated
- ❌ Binary classification (loses information vs. continuous)
- ❌ Requires careful handling of class imbalance
- ❌ Performance may not generalize beyond training population
- ❌ Less established clinical adoption

---

## Prediction Targets: Different Problems

### NHS Regression Model Target
**Predicts:** Absolute Oxford Knee Score at 6 months post-op
- **Scale:** 0-48 points (continuous)
- **Clinical Meaning:** How well patients' knees function at 6 months
- **Typical Values:** Mean ~34.43, SD ~4.74
- **Use Case:** Benchmarking hospitals; comparing expected vs. observed outcomes

**Example Interpretation:**
- Patient A expected to achieve OKS of 38 = Excellent outcome (minimal pain, good function)
- Patient B expected to achieve OKS of 26 = Fair outcome (moderate pain/limitation)

---

### Best EBM Model Target
**Predicts:** Binary outcome class - Good vs. Poor clinical improvement
- **Definition:** 
  - **Good** = Improvement ≥ 7 points on OKS (≥15% improvement from baseline)
  - **Poor** = Improvement < 7 points
- **Output:** Probability of good outcome (0-1)
- **Use Case:** Risk stratification; identifying patients at risk of poor improvement

**Example Interpretation:**
- Patient A: EBM predicts 85% probability of achieving ≥7 point improvement = Low risk
- Patient B: EBM predicts 22% probability of achieving ≥7 point improvement = High risk

---

## Performance Characteristics

### Prediction Granularity

| Model | Output Type | Information Retained |
|-------|------------|---------------------|
| NHS | Continuous (0-48) | Precise absolute outcome |
| EBM | Binary (Good/Poor) | Clinically dichotomized outcome |

**Trade-off:** 
- NHS preserves fine-grained prediction information
- EBM provides clearer clinical actionability (which patients to prioritize?)

---

### Applicable Use Scenarios

**Use NHS Regression Model When:**
1. ✅ Comparing hospital performance (are we meeting national benchmarks?)
2. ✅ Predicting absolute functional outcome for patient counseling
3. ✅ Identifying outlier hospitals (unusually good/poor outcomes)
4. ✅ Long-term prognostic counseling (what score should patient expect?)
5. ✅ Research comparing outcomes across healthcare systems

**Use Best EBM Model When:**
1. ✅ **Identifying high-risk patients** for additional support
2. ✅ Understanding which patient characteristics drive poor outcomes
3. ✅ Tailored pre-operative counseling (risk group assignment)
4. ✅ Allocating post-operative rehabilitation resources
5. ✅ Quality improvement (which factors to address?)
6. ✅ Explaining predictions to patients/clinicians (interpretable)

---

## Feature Influence & Interpretability

### NHS Regression Model Features
**Typical Pre-operative Inputs (not explicitly documented in this project):**
- Baseline OKS score
- Patient age
- Comorbidity indicators
- BMI/physical characteristics
- Socioeconomic factors

**Feature Relationships:** 
- Linear coefficients (transparent but may miss complexity)
- Limited interaction terms

---

### Best EBM Model Features
**45+ Pre-operative Features Including:**
- OKS baseline components (pain, function subscales)
- Demographic variables (age bands, gender)
- Clinical indicators (comorbidities, previous surgeries)
- Psychological factors
- Encoded categorical variables

**Feature Relationships:**
- Non-linear relationships captured per feature
- Feature interactions automatically discovered
- Global and local feature importance available
- Per-instance predictions explainable

**Example Feature Importance Insights:**
- Feature A: Being older increases probability of poor outcome
- Feature B: Higher baseline OKS actually reduces risk (already functioning well)
- Feature C: Specific comorbidity combination has synergistic negative effect

---

## Data & Generalizability

### NHS Model Generalizability
- **Training Population:** All NHS knee replacements (2013-2019)
- **Validated On:** Multiple NHS regions/hospitals
- **Geographic Scope:** England-wide
- **Generalization:** Expected to work well across any NHS hospital
- **Generalization Risk:** Potential bias toward NHS patient population; may not generalize internationally

### Best EBM Model Generalizability
- **Training Population:** This project's cleaned dataset (~2016-2019 knee replacements)
- **Data Source:** NHS PROMS (same as above)
- **Validation:** Cross-validation on training data only
- **Generalization:** Unknown performance on future/external data
- **Generalization Risk:** 
  - ⚠️ Not externally validated
  - ⚠️ May overfit to project-specific data patterns
  - ⚠️ Requires external validation before clinical deployment
  - ⚠️ Cross-validation ≠ external validation

---

## Model Interpretability: Direct Comparison

### NHS Regression Model Interpretability
**Transparency Level:** ⭐⭐⭐ (Moderate-High)
- Regression coefficients directly interpretable
- Linear relationships easy to understand
- Can explain predictions as linear combinations
- Drawback: May obscure non-linear patterns

**Example Explanation:**
"Patient's expected OKS = 35.2 because:
- Base prediction: 30
- Age (63 years): +2.1
- Baseline OKS (18): +3.2
- Comorbidity score: -0.1"

---

### Best EBM Model Interpretability
**Transparency Level:** ⭐⭐⭐⭐⭐ (Very High)
- **Global Interpretability:** Feature importance rankings
- **Local Interpretability:** Per-prediction feature contributions
- **Visual Explanations:** Feature interaction plots available
- **Additive Nature:** Each feature contribution shown explicitly

**Example Explanation:**
"Patient has 72% probability of poor outcome (<7 point improvement) because:
- Age 63: +0.15 probability (high age increases risk)
- Baseline OKS 18: -0.08 probability (already limited, less room to improve)
- Knee pain subscale 8: +0.20 probability (high baseline pain → harder to improve)
- Depression indicator: +0.12 probability (mental health factor)"

**Advantage:** EBM provides local explanations for every prediction

---

## Clinical Decision Support

### How Each Model Informs Clinical Practice

| Decision Type | NHS Model Approach | EBM Model Approach |
|----------------|-------------------|-------------------|
| **Pre-op Counseling** | "Your expected knee score will be ~37" | "You have 78% chance of good improvement" |
| **Patient Selection** | Benchmark against expected outcome | Risk-stratify for additional support |
| **Quality Monitoring** | Monitor hospital vs. national average | Identify modifiable risk factors |
| **Resource Allocation** | Benchmarking for hospital performance | Target rehab resources to high-risk patients |
| **Research** | Case-mix adjustment in analyses | Understanding outcome drivers |

---

## Strengths & Weaknesses Summary

### NHS Regression Model
**Strengths:**
- ✅ Nationally validated
- ✅ Continuous outcome (full information)
- ✅ Case-mix adjusted
- ✅ Established deployment standard

**Weaknesses:**
- ❌ Linear assumptions
- ❌ Limited to outcome prediction (not risk stratification)
- ❌ Less transparent feature interactions
- ❌ All-or-nothing: average prediction across population

---

### Best EBM Model
**Strengths:**
- ✅ Interpretable & explainable
- ✅ Identifies high-risk patients
- ✅ Captures non-linear patterns
- ✅ Shows feature interactions
- ✅ Per-patient explanations

**Weaknesses:**
- ❌ Not externally validated
- ❌ Project-specific generalization concerns
- ❌ Binary outcome (information loss)
- ❌ Requires dedicated EBM knowledge to interpret

---

## Recommendations for Model Use

### Use Both Models Together

**Optimal Strategy:**
1. **Start with NHS Regression Model** for:
   - Initial outcome prediction (expected score)
   - Hospital benchmarking context
   - National reference point

2. **Layer with EBM Model** for:
   - Risk stratification (who needs more attention?)
   - Understanding why prediction (feature contribution)
   - Personalized clinical decision-making

3. **Triangulate with Clinical Judgment:**
   - Both models are statistical predictions
   - Combine with clinical assessment
   - Discuss limitations with patients

---

### Deployment Recommendations

**For Internal Clinical Use (Project/Single Hospital):**
- ✅ **Recommended:** EBM model for interpretability + resource targeting
- ⚠️ **Caution:** Validate on external data before wider adoption

**For System-Wide Benchmarking (Multi-Hospital):**
- ✅ **Recommended:** NHS regression model (nationally validated)
- ⚠️ **Enhancement:** Add EBM risk stratification for quality improvement

**For Patient-Facing Counseling:**
- ✅ **Recommend:** EBM probability estimates (simpler to communicate)
- ✅ **Context:** Provide with NHS population context

---

## Next Steps for Improvement

### For NHS Model Enhancement
1. Compare NHS predictions vs. actual outcomes in your dataset
2. Assess calibration (are predicted scores accurate?)
3. Identify systematic deviations (which hospitals over/underperform?)

### For EBM Model Enhancement
1. **External Validation:** Test on new data from different hospitals/years
2. **Clinical Validation:** Compare predictions to expert clinician judgment
3. **Threshold Optimization:** Determine optimal probability threshold for "high-risk" classification
4. **Prospective Evaluation:** Real-world deployment with outcome tracking
5. **Feature Engineering:** Explore additional interaction terms of clinical interest

### Combined Analysis
1. **Comparative Prediction Study:** Does EBM add value beyond NHS baseline?
2. **Patient Stratification:** Identify discordant predictions (where models disagree)
3. **Clinical Validation:** Which model better predicts actual outcomes in your population?
4. **Cost-Effectiveness:** Does EBM-guided risk stratification improve outcomes/reduce costs?

---

## Conclusion

The NHS Regression Model and Best EBM Model represent **complementary approaches** to outcome prediction:

- **NHS Model:** Provides validated, nationally-standardized continuous outcome predictions
- **EBM Model:** Provides interpretable, actionable risk stratification and clinical insights

**Best Practice:** Use both models in combination—NHS for benchmark context and EBM for identifying and explaining high-risk patients who need additional support.

The EBM model's superior interpretability makes it particularly valuable for:
- Understanding outcome drivers
- Implementing targeted quality improvement
- Patient risk stratification
- Generating clinically actionable insights

However, the EBM model requires external validation before wide deployment and should be positioned as a complementary tool rather than a replacement for nationally-validated NHS methodology.

---

## Technical Notes

### Model Comparison Data
- **EBM Model Location:** `/code/best_ebm_model.joblib`
- **Comparison Script:** `/code/compare_models.py`
- **Feature Analysis:** `/code/EBM_Feature_Importance_Analysis.ipynb`
- **Training Details:** `/code/modelling_experiment Jos EBM.ipynb`

### Data References
- **NHS PROMS Source:** 2016/17-2018/19 knee replacement data
- **Target Definitions:**
  - NHS: OKS absolute score (0-48)
  - EBM: Binary improvement ≥7 points
- **Feature Set:** 45+ pre-operative variables, fully encoded

---

*Comparative analysis completed February 2026*
*Models: NHS Regression vs. Explainable Boosting Machine (EBM)*
