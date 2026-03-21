# Model Card: Knee Replacement OKS Post-Op Q Predicted

## Overview
This model card documents the **Knee Replacement OKS Post-Op Q Predicted** variable in the NHS PROMS dataset. This is a pre-calculated predicted score supplied by NHS Digital that estimates patient-reported Oxford Knee Score (OKS) outcomes at 6 months post-total knee replacement.

---

## Model Details

### Model Name
Knee Replacement OKS Post-Op Q Predicted (Primary Outcome Variable)

### Model Type
Regression model (predictive)

### Developer
NHS Digital PROMS Programme

### Source Document
*Using the Results of Patient Experience Surveys to improve the Quality of care* 
(Department of Health, 2013)  
https://assets.publishing.service.gov.uk/media/5a7c36f440f0b67d0b11fa1e/dh_133449.pdf

### Purpose
To provide predicted estimates of post-operative Oxford Knee Score (OKS T1) for knee replacement patients. This metric allows hospitals to:
- Benchmark their outcomes against national standards
- Identify outlier performance
- Monitor quality of care improvements
- Risk-adjust for case-mix variation

---

## Input Data

### Target Measure
**Oxford Knee Score (OKS) at 6 months post-op**
- Validated 12-item patient-reported outcome measure
- Score range: 0-48 points
- Higher scores indicate better knee function and patient satisfaction

### Pre-operative Features
The model uses pre-operative patient characteristics to predict post-operative OKS outcomes. Based on NHS methodology, typical inputs include:
- Pre-operative OKS baseline score
- Patient demographics
- Comorbidity factors
- Clinical indicators

*Specific feature set details available in NHS PROMS Programme technical documentation*

---

## Output

### Variable Name (Raw NHS Data)
`Knee Replacement OKS Post-Op Q Predicted`

### Variable Name (Project Dataset)
`oks_oks_t1_predicted`

### Output Type
Continuous numerical prediction (float)

### Output Range
7.06 - 48.00 points (based on data review)

### Output Interpretation
- Predicted patient OKS score at 6 months post-total knee replacement
- Estimates expected knee function and pain relief on 0-48 scale
- Used for comparative analysis and hospital benchmarking

---

## Data Characteristics

### Data Source
NHS Digital PROMS Programme (2016/17 - 2018/19 data packs)

### Sample Size
~133,855 knee replacement patients (non-null predictions)

### Descriptive Statistics
| Statistic | Value |
|-----------|-------|
| Mean | 34.43 |
| Standard Deviation | 4.74 |
| Minimum | 7.06 |
| Maximum | 48.00 |
| Median | ~34-35 |

---

## Validation & Performance

### Intended Use
Hospital-level benchmarking and quality monitoring for total knee replacement outcomes

### Clinical Validation
- Developed and validated by NHS Digital
- Used nationally for PROMs Programme reporting
- Based on established prediction methodology (see source document)

### Known Limitations
1. **Case-mix adjustment**: Predictions account for pre-operative patient characteristics but may not capture all sources of variation
2. **Temporal applicability**: Model trained on historical data (pre-2019)
3. **Data completeness**: Some patients may have missing pre-operative or post-operative OKS scores
4. **Generalizability**: Model specific to English NHS population

---

## Model Fairness & Bias Considerations

### Equity Considerations
- NHS PROMS data represents English NHS patients (may not generalize to other healthcare systems)
- Potential socioeconomic or demographic biases if certain groups under-represented in survey responses
- Recommendations: Stratified analysis by patient demographics to identify disparities

### Mitigation Strategies
- National standardization allows comparison across hospitals
- Transparent benchmarking methodology
- Continuous monitoring of outcome disparities

---

## Ethical Considerations

### Primary Use Case
Quality improvement and transparency in NHS knee replacement care

### Potential Risks
- Overly simplistic comparison between hospitals without full context
- Potential misinterpretation of predictions as causal relationships
- Risk of gaming or adverse incentives if used punitively rather than developmentally

### Recommendations
1. Use as part of comprehensive quality improvement process
2. Always contextualize with qualitative feedback and clinical understanding
3. Account for case-mix variation and other confounders
4. Combine with other outcome metrics (e.g., complications, length of stay, infection rates)

---

## Data & Model Governance

### Data Access
- NHS Digital PROMS Programme: Publicly available data packs (2016/17-2018/19)
- Data licensing: Open Government Licence v3.0
- Repository: NHS Digital publications

### Model Governance
- **Maintained by**: NHS Digital PROMS Programme
- **Last updated**: Model methodology described in 2013 source document
- **Update frequency**: Predictions supplied with annual PROMS data releases

### Documentation References
- Primary source: *Using the Results of Patient Experience Surveys to improve the Quality of care* (DH, 2013)
- NHS PROMS Programme: https://www.england.nhs.uk/publication/national-proms-programme-documentation/
- Additional guidance available through NHS Digital

---

## Technical Implementation Notes

### Dataset Integration
In this project, the variable `oks_oks_t1_predicted` is derived directly from NHS raw data:
- **Column source**: "Knee Replacement OKS Post-Op Q Predicted"
- **Data type**: Float32
- **Missing value handling**: Approximately 133,855 non-null values across ~160k+ knee replacement records
- **No model retraining**: This is a pre-calculated NHS variable, not a model built in this project

### Usage in Analysis
- Used for benchmarking and comparative effectiveness research
- Enables stratified analysis of outcomes by patient characteristics
- Baseline for assessing model improvements (e.g., EBM models in this project)

---

## Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-22 | Initial model card creation based on NHS PROMS methodology |

---

## Contact & Support

**For questions about:**
- **NHS PROMS methodology**: NHS Digital (https://www.england.nhs.uk/)
- **This project's use of the variable**: See project README and data documentation
- **Source document access**: UK Government Publications archive

---

## Appendix: Oxford Knee Score (OKS) Details

The OKS is a validated 12-item patient-reported outcome measure specifically designed for knee replacement assessment.

### OKS Components
- Pain: 6 items
- Function: 6 items
- Response scale: 5-point Likert scale per item
- Total score: 0-48 points

### Score Interpretation
- **0-18 points**: Poor outcome (significant pain/dysfunction)
- **19-27 points**: Fair outcome
- **28-36 points**: Good outcome
- **37-48 points**: Excellent outcome (minimal pain/dysfunction)

### Clinical Significance
- Minimal clinically important difference (MCID): ~5 points
- Used to assess patient satisfaction with knee replacement
- Primary outcome for NHS knee replacement quality reporting

---

*Model card created for EAISI Group Project - NHS PROMS Analysis (2026)*
