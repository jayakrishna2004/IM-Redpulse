export const COLORS = {
  base:          '#07080f',
  surface:       '#0d0f1a',
  card:          '#111528',
  cardHover:     '#161b35',
  input:         '#1a1f38',
  border:        'rgba(255,255,255,0.08)',
  borderBright:  'rgba(255,255,255,0.16)',

  red:           '#ff1a3c',
  redDim:        '#cc1530',
  redGlow:       'rgba(255,26,60,0.3)',
  redSubtle:     'rgba(255,26,60,0.12)',

  amber:         '#f59e0b',
  green:         '#10b981',
  blue:          '#3b82f6',
  purple:        '#8b5cf6',

  textPrimary:   '#f0f2ff',
  textSecondary: '#8892b0',
  textMuted:     '#4a5580',
};

export const FONTS = {
  regular:    'System',
  bold:       'System',
};

export const commonStyles = {
  screen: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  bloodBadge: {
    backgroundColor: 'rgba(255,26,60,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,26,60,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bloodBadgeText: {
    color: COLORS.red,
    fontWeight: '800',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  bigButton: {
    backgroundColor: COLORS.red,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bigButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
};
