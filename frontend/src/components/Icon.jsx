export default function Icon({ name, size = 18, stroke = 1.75, className, style }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    flexShrink: 0,
    className,
    style,
  };

  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>;
    case 'search':
      return <svg {...common}><circle cx={11} cy={11} r={7}/><path d="m20 20-3.5-3.5"/></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'truck':
      return <svg {...common}><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx={7} cy={18} r={2}/><circle cx={17} cy={18} r={2}/></svg>;
    case 'clipboard':
      return <svg {...common}><rect x={5} y={4} width={14} height={17} rx={2}/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/></svg>;
    case 'map-pin':
      return <svg {...common}><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx={12} cy={9} r={2.5}/></svg>;
    case 'calendar':
      return <svg {...common}><rect x={3.5} y={5} width={17} height={15} rx={2}/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>;
    case 'clock':
      return <svg {...common}><circle cx={12} cy={12} r={9}/><path d="M12 7v5l3 2"/></svg>;
    case 'wallet':
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x={3} y={7} width={18} height={12} rx={2}/><circle cx={17} cy={13} r={1.2} fill="currentColor" stroke="none"/></svg>;
    case 'user':
      return <svg {...common}><circle cx={12} cy={8} r={4}/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>;
    case 'bell':
      return <svg {...common}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z"/><path d="M10 21h4"/></svg>;
    case 'message':
      return <svg {...common}><path d="M4 5h16v11H8l-4 4z"/></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 5 5 9-11"/></svg>;
    case 'check-circle':
      return <svg {...common}><circle cx={12} cy={12} r={9}/><path d="m8 12 3 3 5-6"/></svg>;
    case 'x':
      return <svg {...common}><path d="m6 6 12 12M6 18 18 6"/></svg>;
    case 'x-circle':
      return <svg {...common}><circle cx={12} cy={12} r={9}/><path d="m9 9 6 6M15 9l-6 6"/></svg>;
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-left':
      return <svg {...common}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
    case 'arrow-up':
      return <svg {...common}><path d="M12 19V5M6 11l6-6 6 6"/></svg>;
    case 'arrow-down':
      return <svg {...common}><path d="M12 5v14M6 13l6 6 6-6"/></svg>;
    case 'chevron-right':
      return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevron-left':
      return <svg {...common}><path d="m15 6-6 6 6 6"/></svg>;
    case 'chevron-down':
      return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case 'settings':
      return <svg {...common}><circle cx={12} cy={12} r={3}/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'sparkles':
      return <svg {...common}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M6.5 17.5l2.8-2.8M14.7 9.3l2.8-2.8"/></svg>;
    case 'camera':
      return <svg {...common}><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx={12} cy={13} r={3.2}/></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'star':
      return <svg {...common}><path d="M12 3.5 14.6 9l5.9.6-4.4 4 1.3 5.8L12 16.6 6.6 19.4 7.9 13.6 3.5 9.6 9.4 9z"/></svg>;
    case 'filter':
      return <svg {...common}><path d="M4 5h16M7 12h10M10 19h4"/></svg>;
    case 'menu':
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'trending-up':
      return <svg {...common}><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case 'list':
      return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>;
    case 'package':
      return <svg {...common}><path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>;
    case 'zap':
      return <svg {...common}><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></svg>;
    case 'phone':
      return <svg {...common}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>;
    case 'more-horizontal':
      return <svg {...common}><circle cx={5} cy={12} r={1.5} fill="currentColor" stroke="none"/><circle cx={12} cy={12} r={1.5} fill="currentColor" stroke="none"/><circle cx={19} cy={12} r={1.5} fill="currentColor" stroke="none"/></svg>;
    case 'leaf':
      return <svg {...common}><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19 14 10"/></svg>;
    case 'key':
      return <svg {...common}><circle cx={8} cy={15} r={4}/><path d="m11 12 9-9M16 8l3 3"/></svg>;
    case 'log-out':
      return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>;
    case 'upload':
      return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/></svg>;
    case 'image':
      return <svg {...common}><rect x={3} y={3} width={18} height={18} rx={2}/><circle cx={8.5} cy={8.5} r={1.5}/><path d="m21 15-5-5L5 21"/></svg>;
    case 'file-text':
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
    case 'alert-circle':
      return <svg {...common}><circle cx={12} cy={12} r={9}/><path d="M12 8v4M12 16h.01"/></svg>;
    case 'info':
      return <svg {...common}><circle cx={12} cy={12} r={9}/><path d="M12 16v-4M12 8h.01"/></svg>;
    case 'refresh':
      return <svg {...common}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
    case 'eye':
      return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/></svg>;
    case 'copy':
      return <svg {...common}><rect x={9} y={9} width={13} height={13} rx={2}/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    default:
      return null;
  }
}
