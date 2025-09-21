export const OPPORTUNITY_THRESHOLDS = {
  HIGH_CONC_SHARE: Number(process.env.OPP_HIGH_CONC_SHARE ?? 0.6),
  HIGH_CONC_IMPACT: Number(process.env.OPP_HIGH_CONC_IMPACT ?? 0.15),
  TREND_INCREASE: Number(process.env.OPP_TREND_INCREASE ?? 0.2),
  TREND_RECOVERABLE: Number(process.env.OPP_TREND_RECOVERABLE ?? 0.5),
  REBAR_MIN_KG: Number(process.env.OPP_REBAR_MIN_KG ?? 2000),
  REBAR_MIN_SHARE: Number(process.env.OPP_REBAR_MIN_SHARE ?? 0.1),
  REBAR_IMPACT: Number(process.env.OPP_REBAR_IMPACT ?? 0.25),
} as const;
