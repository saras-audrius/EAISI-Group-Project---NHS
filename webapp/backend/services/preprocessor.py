"""
Feature preprocessing for patient input.

Constructs the exact 57-column feature vector expected by the models,
matching the schema of X_train_encoded_wo_provider.parquet.

Column order (57 total):
  gender, t0_assisted, t0_assisted_by, t0_symptom_period, t0_previous_surgery,
  t0_disability, heart_disease, high_bp, stroke, circulation, lung_disease,
  diabetes, kidney_disease, nervous_system, liver_disease, cancer, depression,
  arthritis, t0_mobility, t0_self_care, t0_activity, t0_discomfort, t0_anxiety,
  oks_t0_pain, oks_t0_night_pain, oks_t0_washing, oks_t0_transport, oks_t0_walking,
  oks_t0_standing, oks_t0_limping, oks_t0_kneeling, oks_t0_work, oks_t0_confidence,
  oks_t0_shopping, oks_t0_stairs, oks_t0_score,
  University Hospital, independent_hospital, comorbidity_count,
  oks_pain_subscale, oks_function_subscale, oks_adl_subscale,
  year_2017/18, year_2018/19,
  age_band_3, age_band_4, age_band_5,
  t0_living_arrangements_2.0, t0_living_arrangements_4.0,
  Region_East of England, Region_London, Region_North East, Region_North West,
  Region_South East, Region_South West, Region_West Midlands,
  Region_Yorkshire and The Humber

Subscale formulas (verified against training data):
  oks_pain_subscale     = oks_t0_pain + oks_t0_night_pain
  oks_function_subscale = oks_t0_washing + oks_t0_transport + oks_t0_walking
                          + oks_t0_limping + oks_t0_kneeling + oks_t0_work
  oks_adl_subscale      = oks_t0_standing + oks_t0_confidence
                          + oks_t0_shopping + oks_t0_stairs
"""
import numpy as np
import pandas as pd

COLUMN_ORDER = [
    "gender", "t0_assisted", "t0_assisted_by", "t0_symptom_period",
    "t0_previous_surgery", "t0_disability",
    "heart_disease", "high_bp", "stroke", "circulation", "lung_disease",
    "diabetes", "kidney_disease", "nervous_system", "liver_disease",
    "cancer", "depression", "arthritis",
    "t0_mobility", "t0_self_care", "t0_activity", "t0_discomfort", "t0_anxiety",
    "oks_t0_pain", "oks_t0_night_pain", "oks_t0_washing", "oks_t0_transport",
    "oks_t0_walking", "oks_t0_standing", "oks_t0_limping", "oks_t0_kneeling",
    "oks_t0_work", "oks_t0_confidence", "oks_t0_shopping", "oks_t0_stairs",
    "oks_t0_score",
    "University Hospital", "independent_hospital", "comorbidity_count",
    "oks_pain_subscale", "oks_function_subscale", "oks_adl_subscale",
    "year_2017/18", "year_2018/19",
    "age_band_3", "age_band_4", "age_band_5",
    "t0_living_arrangements_2.0", "t0_living_arrangements_4.0",
    "Region_East of England", "Region_London", "Region_North East",
    "Region_North West", "Region_South East", "Region_South West",
    "Region_West Midlands", "Region_Yorkshire and The Humber",
]

COMORBIDITIES = [
    "heart_disease", "high_bp", "stroke", "circulation", "lung_disease",
    "diabetes", "kidney_disease", "nervous_system", "liver_disease",
    "cancer", "depression", "arthritis",
]

REGIONS = [
    "East of England", "London", "North East", "North West",
    "South East", "South West", "West Midlands", "Yorkshire and The Humber",
]


def build_feature_vector(patient: dict) -> np.ndarray:
    """
    Build a 57-column feature vector from raw patient input dict.

    Patient dict keys (from the API request):
      age_band (int): 2=40-59, 3=60-69, 4=70-79, 5=80+
      gender (int): 0=Female, 1=Male
      t0_assisted (int): 0/1
      t0_previous_surgery (int): 0/1
      t0_disability (int): 0/1
      t0_symptom_period (int): 1-4
      t0_living_arrangements (int): 1, 2, or 4
      t0_mobility, t0_self_care, t0_activity, t0_discomfort, t0_anxiety (int): 1-3
      oks_t0_{item} (int): 0-4 each (12 items)
      oks_t0_score (float): 0-48
      heart_disease...arthritis (int): 0/1 each
      university_hospital (int): 0/1 (default 1)
      independent_hospital (int): 0/1 (default 0)
      region (str): one of REGIONS (default 'West Midlands' as most central)
    """
    p = patient
    comorbidity_count = sum(p.get(c, 0) for c in COMORBIDITIES)

    oks_pain_subscale = p["oks_t0_pain"] + p["oks_t0_night_pain"]
    oks_function_subscale = (
        p["oks_t0_washing"] + p["oks_t0_transport"] + p["oks_t0_walking"]
        + p["oks_t0_limping"] + p["oks_t0_kneeling"] + p["oks_t0_work"]
    )
    oks_adl_subscale = (
        p["oks_t0_standing"] + p["oks_t0_confidence"]
        + p["oks_t0_shopping"] + p["oks_t0_stairs"]
    )

    age_band = p["age_band"]
    living_arr = p["t0_living_arrangements"]
    region = p.get("region", "West Midlands")

    row = {
        "gender": float(p["gender"]),
        "t0_assisted": float(p["t0_assisted"]),
        "t0_assisted_by": float(p.get("t0_assisted_by", 0)),
        "t0_symptom_period": float(p["t0_symptom_period"]),
        "t0_previous_surgery": float(p["t0_previous_surgery"]),
        "t0_disability": float(p["t0_disability"]),
        "heart_disease": float(p["heart_disease"]),
        "high_bp": float(p["high_bp"]),
        "stroke": float(p["stroke"]),
        "circulation": float(p["circulation"]),
        "lung_disease": float(p["lung_disease"]),
        "diabetes": float(p["diabetes"]),
        "kidney_disease": float(p["kidney_disease"]),
        "nervous_system": float(p["nervous_system"]),
        "liver_disease": float(p["liver_disease"]),
        "cancer": float(p["cancer"]),
        "depression": float(p["depression"]),
        "arthritis": float(p["arthritis"]),
        "t0_mobility": float(p["t0_mobility"]),
        "t0_self_care": float(p["t0_self_care"]),
        "t0_activity": float(p["t0_activity"]),
        "t0_discomfort": float(p["t0_discomfort"]),
        "t0_anxiety": float(p["t0_anxiety"]),
        "oks_t0_pain": float(p["oks_t0_pain"]),
        "oks_t0_night_pain": float(p["oks_t0_night_pain"]),
        "oks_t0_washing": float(p["oks_t0_washing"]),
        "oks_t0_transport": float(p["oks_t0_transport"]),
        "oks_t0_walking": float(p["oks_t0_walking"]),
        "oks_t0_standing": float(p["oks_t0_standing"]),
        "oks_t0_limping": float(p["oks_t0_limping"]),
        "oks_t0_kneeling": float(p["oks_t0_kneeling"]),
        "oks_t0_work": float(p["oks_t0_work"]),
        "oks_t0_confidence": float(p["oks_t0_confidence"]),
        "oks_t0_shopping": float(p["oks_t0_shopping"]),
        "oks_t0_stairs": float(p["oks_t0_stairs"]),
        "oks_t0_score": float(p["oks_t0_score"]),
        "University Hospital": float(p.get("university_hospital", 1)),
        "independent_hospital": float(p.get("independent_hospital", 0)),
        "comorbidity_count": float(comorbidity_count),
        "oks_pain_subscale": float(oks_pain_subscale),
        "oks_function_subscale": float(oks_function_subscale),
        "oks_adl_subscale": float(oks_adl_subscale),
        # Year: default to 2018/19 (most recent year in training data)
        "year_2017/18": 0.0,
        "year_2018/19": 1.0,
        # Age band dummies (age_band=2 is reference)
        "age_band_3": 1.0 if age_band == 3 else 0.0,
        "age_band_4": 1.0 if age_band == 4 else 0.0,
        "age_band_5": 1.0 if age_band == 5 else 0.0,
        # Living arrangements dummies (=1 is reference)
        "t0_living_arrangements_2.0": 1.0 if living_arr == 2 else 0.0,
        "t0_living_arrangements_4.0": 1.0 if living_arr == 4 else 0.0,
        # Region dummies (East Midlands is reference category)
        "Region_East of England": 1.0 if region == "East of England" else 0.0,
        "Region_London": 1.0 if region == "London" else 0.0,
        "Region_North East": 1.0 if region == "North East" else 0.0,
        "Region_North West": 1.0 if region == "North West" else 0.0,
        "Region_South East": 1.0 if region == "South East" else 0.0,
        "Region_South West": 1.0 if region == "South West" else 0.0,
        "Region_West Midlands": 1.0 if region == "West Midlands" else 0.0,
        "Region_Yorkshire and The Humber": 1.0 if region == "Yorkshire and The Humber" else 0.0,
    }

    # Return as DataFrame to preserve feature names (avoids sklearn warning)
    df = pd.DataFrame([row])[COLUMN_ORDER]
    return df
