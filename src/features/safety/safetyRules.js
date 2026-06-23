const selfHarmTerms =
  "(kill myself|end my life|take my life|suicide|suicidal|hurt myself|harm myself|self harm|self-harm|cut myself|i want to die|dont want to live|don't want to live|can't go on|cant go on)";

export const idiomPatterns = [
  /\bthis project is killing me\b/i,
  /\bi'?m dead tired\b/i,
  /\bi could die of embarrassment\b/i,
  /\bi'?m so embarrassed i could die\b/i,
  /\bthat killed me\b/i,
];

export const safetyRules = [
  {
    category: "suicide_plan_or_means",
    level: "imminent",
    confidence: 0.98,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "show_988_or_local_crisis",
      "show_emergency_services",
      "offer_trusted_contact",
      "open_safety_plan",
      "log_for_review",
    ],
    patterns: [
      /\b(plan|gun|weapon|rope|pills|means|tonight|today|right now|ready)\b.{0,80}\b(kill myself|hurt myself|harm myself|end it|end my life|suicide|die)\b/i,
      /\b(kill myself|hurt myself|harm myself|end it|end my life|suicide|die)\b.{0,80}\b(plan|gun|weapon|rope|pills|means|tonight|today|right now|ready)\b/i,
      /\bi have a plan to end it\b/i,
      /\bend it tonight\b/i,
    ],
  },
  {
    category: "severe_intoxication_or_overdose",
    level: "imminent",
    confidence: 0.96,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "show_emergency_services",
      "show_988_or_local_crisis",
      "offer_trusted_contact",
      "log_for_review",
    ],
    patterns: [
      /\b(took|swallowed|ingested).{0,30}\b(bunch|handful|too many|overdose|od'd|od)\b.{0,30}\b(pills|meds|medications|tablets)\b/i,
      /\b(overdose|overdosed|od'd|od)\b/i,
    ],
  },
  {
    category: "self_harm_intent",
    level: "high",
    confidence: 0.91,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "ask_direct_safety_question",
      "show_988_or_local_crisis",
      "offer_trusted_contact",
      "open_safety_plan",
      "log_for_review",
    ],
    patterns: [
      new RegExp(`\\b(i want to|i'?m going to|i might|i may|i feel like|i am about to).{0,50}\\b${selfHarmTerms}\\b`, "i"),
      /\bi'?m going to hurt myself\b/i,
    ],
  },
  {
    category: "self_harm_ideation",
    level: "moderate",
    confidence: 0.86,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "ask_direct_safety_question",
      "show_988_or_local_crisis",
      "open_safety_plan",
      "log_for_review",
    ],
    patterns: [new RegExp(`\\b${selfHarmTerms}\\b`, "i")],
  },
  {
    category: "violence_to_others",
    level: "high",
    confidence: 0.88,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "ask_direct_safety_question",
      "show_emergency_services",
      "recommend_human_support",
      "log_for_review",
    ],
    patterns: [
      /\b(i might|i want to|i am going to|i'?m going to).{0,40}\b(hurt|kill|attack|stab|shoot)\b.{0,30}\b(someone|them|him|her|people|myself or someone)\b/i,
    ],
  },
  {
    category: "abuse_or_exploitation",
    level: "high",
    confidence: 0.84,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "recommend_human_support",
      "offer_trusted_contact",
      "log_for_review",
    ],
    patterns: [
      /\bi'?m not safe at home\b/i,
      /\b(abused|being abused|exploited|trafficked|forced sex|domestic violence)\b/i,
    ],
  },
  {
    category: "minor_user_high_risk",
    level: "high",
    confidence: 0.9,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "recommend_human_support",
      "offer_trusted_contact",
      "log_for_review",
    ],
    patterns: [
      /\b(i'?m|i am) (a )?(minor|under 18|underage)\b.{0,80}\b(exploiting|exploited|abuse|abused|threatening|forced)\b/i,
    ],
  },
  {
    category: "psychosis_or_reality_confusion",
    level: "high",
    confidence: 0.83,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "recommend_human_support",
      "show_988_or_local_crisis",
      "log_for_review",
    ],
    patterns: [
      /\bhearing voices\b.{0,80}\b(hurt myself|hurt someone|kill myself|kill someone|commanding|telling me)\b/i,
      /\bvoices telling me to\b/i,
    ],
  },
  {
    category: "mania_or_severe_impulsivity",
    level: "moderate",
    confidence: 0.78,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "recommend_human_support",
      "ask_direct_safety_question",
      "log_for_review",
    ],
    patterns: [
      /\b(haven'?t|have not) slept in days\b.{0,80}\b(unstoppable|invincible|god|can do anything|reckless)\b/i,
      /\bfeel unstoppable\b.{0,80}\b(haven'?t|have not) slept\b/i,
    ],
  },
  {
    category: "medical_emergency",
    level: "imminent",
    confidence: 0.92,
    actions: [
      "show_sos",
      "pause_ai_chat",
      "show_emergency_services",
      "offer_trusted_contact",
      "log_for_review",
    ],
    patterns: [
      /\b(chest pain|can'?t breathe|can't breathe|stroke|seizure|passed out|unconscious|medical emergency)\b/i,
    ],
  },
  {
    category: "unknown_high_distress",
    level: "low",
    confidence: 0.55,
    actions: ["ask_direct_safety_question", "recommend_human_support"],
    patterns: [
      /\b(want to disappear for a while|everything is too much|i feel hopeless|i can't handle this|i cant handle this)\b/i,
    ],
  },
];
