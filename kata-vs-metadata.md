# KATA vs `metadata/` — question content, field by field

Generated 2026-09-11 10:41:27. **KATA is the live catalogue; `metadata/` is what this repo authored and what the deployed lomda serves.**

For each difference, decide which side is authoritative. Nothing is changed by this report.

**Totals:** 12 items affected — 18 questions differ, 2 exist only in `metadata/`, 0 exist only in KATA.

## `methodica-math-percent-02-01-004` — פלייליסט אימונים - המרת אחוז לשבר (2 סעיפים)

### q2 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"numeric"` |

**answers**

| side | value |
|---|---|
| KATA | `"200, 80"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `[80]` |

## `methodica-math-percent-02-01-006` — פלייליסט אימונים - טבלת פרופורציה (2 סעיפים)

### q1 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"matching"` |

**answers**

| side | value |
|---|---|
| KATA | `"אחוז חלקי - 40, אחוז שלום - 100, כמות שלמה - 200"` |
| metadata/ | `{"source":["40 (האחוז החלקי הנתון)","100 (האחוז השלם)"],"target":["מול x (מספר השירים העבריים, לא ידוע)","מול 200 (סך כל השירים בפלייליסט)"]}` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `[{"source":"40 (האחוז החלקי הנתון)","target":"מול x (מספר השירים העבריים, לא ידוע)"},{"source":"100 (האחוז השלם)","target":"מול 200 (סך כל השירים בפלייליסט)"}]` |

### q2 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"numeric"` |

**answers**

| side | value |
|---|---|
| KATA | `"40/100=x/200, x=80"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `[80]` |

## `methodica-math-percent-02-01-007` — נפתור יחד: יעד צעדים יומי בפרופורציה

### q1 — ONLY IN metadata/ — KATA does not have it

```json
{
 "questionId": "https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-01/methodica-math-percent-02-01-007/q1",
 "questionType": "choice",
 "questionText": "היעד היומי בשעון החכם שלכם הוא 8,000 צעדים. עד הצהריים השלמתם 45% מהיעד. מהי משוואת הפרופורציה הנכונה?",
 "answers": [
  "45%/100% = x/8000",
  "45%/100% = 8000/x",
  "100%/45% = x/8000"
 ],
 "correctAnswers": [
  "45%/100% = x/8000"
 ]
}
```

## `methodica-math-percent-02-01-008` — שאלת חימום: הורדת משחק (המרת אחוז לשבר)

### q1 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `["45/80 · 100","100/45 · 80","45/100 · 80","0.45· 80","0.55· 80"]` |
| metadata/ | `["45/80 · 100","100/45 · 80","45/100 · 80"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `["45/100 · 80","0.45· 80"]` |
| metadata/ | `["45/100 · 80"]` |

## `methodica-math-percent-02-02-003` — יום גיבוש מועדון נוער (3 סעיפים)

### q1 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"matching"` |
| metadata/ | `"choice"` |

**answers**

| side | value |
|---|---|
| KATA | `{"source":["כמות נרשמים חלקית","כמות נרשמים מלאה","אחוז חלקי","אחוז שלם"],"target":["x","60","65%","100%"]}` |
| metadata/ | `["אחוז/כמות הנרשמים: 65% מול x (עליון), 100% מול 60 (תחתון)","אחוז/כמות הנרשמים: 65% מול 100% (עליון), 60 מול x (תחתון)"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[{"source":"כמות נרשמים חלקית","target":"x"},{"source":"כמות נרשמים מלאה","target":"60"},{"source":"אחוז חלקי","target":"65%"},{"source":"אחוז שלם","target":"100%"}]` |
| metadata/ | `["אחוז/כמות הנרשמים: 65% מול x (עליון), 100% מול 60 (תחתון)"]` |

## `methodica-math-percent-02-02-004` — חלוקת נפח ציוד במכולה

### q1 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"fill-in"` |

**answers**

| side | value |
|---|---|
| KATA | `"בישול ומטבח (45%): 90, אוהלים ומבנים (40%): 80, ציוד חבלים ובטיחות (12%): 24, עזרה ראשונה (3%): 6"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `["בישול ומטבח (45%): 90, אוהלים ומבנים (40%): 80, ציוד חבלים ובטיחות (12%): 24, עזרה ראשונה (3%): 6"]` |

## `methodica-math-percent-02-02-007` — סקר טיול שכבתי - נכון/לא נכון (5 סעיפים)

### q1 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `["true","false"]` |
| metadata/ | `["נכון","לא נכון"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `["true"]` |
| metadata/ | `["נכון"]` |

### q2 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `["true","false"]` |
| metadata/ | `["נכון","לא נכון"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `["false"]` |
| metadata/ | `["לא נכון"]` |

### q3 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `["true","false"]` |
| metadata/ | `["נכון","לא נכון"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `["false"]` |
| metadata/ | `["לא נכון"]` |

### q4 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `["true","false"]` |
| metadata/ | `["נכון","לא נכון"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `["true"]` |
| metadata/ | `["נכון"]` |

### q5 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `["true","false"]` |
| metadata/ | `["נכון","לא נכון"]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `["false"]` |
| metadata/ | `["לא נכון"]` |

## `methodica-math-percent-02-03-006` — מעקב ארוחות בוקר עתירות חלבון (2 סעיפים)

### q1 — DIFFERS: questionType, questionText, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"fill-in"` |

**questionText**

| side | value |
|---|---|
| KATA | `"עדי רשם מה אכל בארוחות הבוקר במשך 50 ימי אימון. השלימו את עמודת ה'כמות מתוך כלל ארוחות הבוקר' בטבלה לפי האחוזים הנתונים: כריך חביתה עתיר חלבון 40%, דגני בוקר 20%, יוגורט חלבון 10%, פרי 30%. השתמשו בהמרת האחוז לשבר פשוט/עשרוני."` |
| metadata/ | `"עדי רשם מה אכל בארוחות הבוקר במשך 50 ימי אימון. א. השלימו את עמודת ה'כמות מתוך כלל ארוחות הבוקר' בטבלה לפי האחוזים הנתונים: כריך חביתה עתיר חלבון 40%, דגני בוקר 20%, יוגורט חלבון 10%, פרי 30%. השתמשו בהמרת האחוז לשבר פשוט/עשרוני."` |

**answers**

| side | value |
|---|---|
| KATA | `"כריך חביתה עתיר חלבון (40%): 20, דגני בוקר (20%): 10, יוגורט חלבון (10%): 5, פרי (30%): 15"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `["כריך חביתה עתיר חלבון (40%): 20, דגני בוקר (20%): 10, יוגורט חלבון (10%): 5, פרי (30%): 15"]` |

### q2 — ONLY IN metadata/ — KATA does not have it

```json
{
 "questionId": "https://lomdot.education.gov.il/metodica/720active/math/percent/02/methodica-math-percent-02-03/methodica-math-percent-02-03-006/q2",
 "questionType": "other",
 "questionText": "עדי מצליח לאכול ארוחות עתירות חלבון רק ב-50% מהזמן, והוא מודע לכך שזה לא מספיק, בטח כשמתאמנים. ב. המליצו לעדי על דרך שבה יוכל לוודא שהוא אוכל ארוחות עם מספיק חלבון לפני אימון.",
 "answers": [],
 "correctAnswers": []
}
```

## `methodica-math-percent-02-05-001` — מגמות לימוד י' לפי דיאגרמת עיגול (2 סעיפים)

### q2 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"fill-in"` |

**answers**

| side | value |
|---|---|
| KATA | `"מחשבים (אחרי המעבר): 112, ביולוגיה (אחרי המעבר): 128"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `["מחשבים (אחרי המעבר): 112, ביולוגיה (אחרי המעבר): 128"]` |

## `methodica-math-percent-02-05-002` — תערובת פיצוחים למונדיאל (3 סעיפים)

### q3 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"fill-in"` |

**answers**

| side | value |
|---|---|
| KATA | `"אגוזי מלך: 152, שקדים: 134, בוטנים: 314"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `["אגוזי מלך: 152, שקדים: 134, בוטנים: 314"]` |

## `methodica-math-percent-02-06-001` — חלוקת עלויות חופשת משפחת כהן (4 סעיפים)

### q1 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"fill-in"` |

**answers**

| side | value |
|---|---|
| KATA | `"לינה (60%): 3000, ארוחות (25%): 1250, ספא ומתקנים (10%): 500, חנייה (5%): 250"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `["לינה (60%): 3000, ארוחות (25%): 1250, ספא ומתקנים (10%): 500, חנייה (5%): 250"]` |

### q3 — DIFFERS: answers

**answers**

| side | value |
|---|---|
| KATA | `["לא, כי 25%+5%=30% ו-30% הם בדיוק רבע מהסכום הכולל.","לא, כי 25%+5%=30% ושליש מהסכום הכולל הוא 33 1/3%.","כן, כי 1,250+250=1,500 ₪, ו-1,500 ₪ הם שליש מ-5,000 ₪.","כן, כי 25%+5%=30%  ו - 30% הם בדיוק שליש מהמחיר הכולל."]` |
| metadata/ | `["לא, כי 25%+5%=30% ו-30% הם בדיוק רבע מהסכום הכולל.","לא, כי 25%+5%=30% ושליש מהסכום הכולל הוא 33 1/3%.","כן, כי 1,250+250=1,500 ₪, ו-1,500 ₪ הם שליש מ-5,000 ₪."]` |

### q4 — DIFFERS: answers, correctAnswers

**answers**

| side | value |
|---|---|
| KATA | `[" קובי צודק כי 40% מתוך 1,250 ₪ הם 500 ₪ והיתרה היא 750 ₪ הוקצתה לארוחות ערב.","קובי טועה כי 40% מתוך 1,250 ₪ הם 400 ₪ ולכן על ארוחות הערב הם שילמו 850 ₪.","קובי טועה כי הוא חישב 40% מתוך הסכום הכולל של 5,000 ₪, ולא מתוך סכום הארוחות שהוא 1,250 ₪."]` |
| metadata/ | `["קובי צודק.","קובי טועה כי 40% מתוך 1,250 ₪ הם 400 ₪ ולכן על ארוחות הערב הם שילמו 850 ₪.","קובי טועה כי הוא חישב 40% מתוך הסכום הכולל של 5,000 ₪, ולא מתוך סכום הארוחות שהוא 1,250 ₪."]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[" קובי צודק כי 40% מתוך 1,250 ₪ הם 500 ₪ והיתרה היא 750 ₪ הוקצתה לארוחות ערב."]` |
| metadata/ | `["קובי צודק."]` |

## `methodica-math-percent-02-07-001` — השוואת התקדמות צעדים יומית בין שני יעדים שונים

### q2 — DIFFERS: questionType, answers, correctAnswers

**questionType**

| side | value |
|---|---|
| KATA | `"other"` |
| metadata/ | `"fill-in"` |

**answers**

| side | value |
|---|---|
| KATA | `"שי (80% מתוך 8,000): 6400, אלון (60% מתוך 12,000): 7200"` |
| metadata/ | `[]` |

**correctAnswers**

| side | value |
|---|---|
| KATA | `[]` |
| metadata/ | `["שי (80% מתוך 8,000): 6400, אלון (60% מתוך 12,000): 7200"]` |
