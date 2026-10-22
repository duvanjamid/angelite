export const css = `
:root{--ui-bg:#fff;--ui-fg:#1d2330;--ui-muted:#667085;--ui-line:#e3e6ee;--ui-soft:#f4f5f9;--ui-primary:#d6336c;--ui-primary-fg:#fff;--ui-ok:#2f9e5b;--ui-warn:#d98a00;--ui-err:#d63a3a;--ui-info:#2f6fd6;--ui-radius:8px}
@media(prefers-color-scheme:dark){:root{--ui-bg:#14161d;--ui-fg:#e8eaf1;--ui-muted:#98a1b6;--ui-line:#2a2e3b;--ui-soft:#1d212c;--ui-primary:#ff6b9a;--ui-primary-fg:#14161d}}
ui-button,ui-badge,ui-avatar,ui-tooltip,ui-toggle,ui-rating,ui-dropdown,ui-spinner{display:inline-block}
ui-card,ui-alert,ui-progress,ui-skeleton,ui-tabs,ui-accordion-item,ui-table,ui-pagination,ui-stepper,ui-text-field,ui-select,ui-toasts{display:block}
.ui-btn{font:inherit;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-bg);color:var(--ui-fg);cursor:pointer;transition:border-color .15s,background .15s}
.ui-btn:hover:not(:disabled){border-color:var(--ui-primary)}
.ui-btn:disabled{opacity:.5;cursor:not-allowed}
.ui-btn[data-variant=primary]{background:var(--ui-primary);border-color:var(--ui-primary);color:var(--ui-primary-fg)}
.ui-btn[data-variant=danger]{background:var(--ui-err);border-color:var(--ui-err);color:#fff}
.ui-btn[data-variant=ghost]{border-color:transparent;background:transparent}
.ui-btn[data-size=sm]{padding:3px 9px;font-size:.85em}.ui-btn[data-size=lg]{padding:10px 20px;font-size:1.1em}
.ui-badge{font-size:.75em;font-weight:600;padding:2px 9px;border-radius:99px;background:var(--ui-soft);color:var(--ui-fg)}
.ui-badge[data-variant=primary]{background:var(--ui-primary);color:var(--ui-primary-fg)}
.ui-badge[data-variant=success]{background:var(--ui-ok);color:#fff}.ui-badge[data-variant=warning]{background:var(--ui-warn);color:#fff}.ui-badge[data-variant=danger]{background:var(--ui-err);color:#fff}
.ui-card{border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-bg);overflow:hidden}
.ui-card h4{margin:0;padding:12px 16px;border-bottom:1px solid var(--ui-line);font-size:1em}.ui-card .body{padding:14px 16px}
.ui-alert{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:var(--ui-radius);border:1px solid var(--ui-line);border-left:4px solid var(--ui-info);background:var(--ui-soft)}
.ui-alert[data-type=success]{border-left-color:var(--ui-ok)}.ui-alert[data-type=warning]{border-left-color:var(--ui-warn)}.ui-alert[data-type=error]{border-left-color:var(--ui-err)}
.ui-alert .msg{flex:1}.ui-alert button{border:0;background:none;color:inherit;cursor:pointer;font-size:1.2em;line-height:1}
.ui-avatar{display:inline-grid;place-items:center;border-radius:50%;background:var(--ui-primary);color:var(--ui-primary-fg);font-weight:700;overflow:hidden}
.ui-avatar img{width:100%;height:100%;object-fit:cover}
.ui-spinner{width:1.2em;height:1.2em;border:2px solid var(--ui-line);border-top-color:var(--ui-primary);border-radius:50%;animation:ui-spin .7s linear infinite;vertical-align:middle}
@keyframes ui-spin{to{transform:rotate(360deg)}}
.ui-progress{height:8px;border-radius:99px;background:var(--ui-soft);overflow:hidden}.ui-progress i{display:block;height:100%;background:var(--ui-primary);transition:width .3s}
.ui-skeleton{height:1em;border-radius:6px;background:linear-gradient(90deg,var(--ui-soft),var(--ui-line),var(--ui-soft));background-size:200% 100%;animation:ui-sk 1.2s infinite}
@keyframes ui-sk{to{background-position:-200% 0}}
.ui-toggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.ui-toggle .track{width:38px;height:22px;border-radius:99px;background:var(--ui-line);position:relative;transition:background .15s}
.ui-toggle .track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s}
.ui-toggle[data-on=true] .track{background:var(--ui-primary)}.ui-toggle[data-on=true] .track::after{transform:translateX(16px)}
.ui-field{display:block}.ui-field label{display:block;font-size:.85em;color:var(--ui-muted);margin-bottom:4px}
.ui-field input,.ui-field select{width:100%;font:inherit;padding:7px 10px;border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-bg);color:var(--ui-fg)}
.ui-field input:focus,.ui-field select:focus{outline:2px solid color-mix(in srgb,var(--ui-primary) 40%,transparent);border-color:var(--ui-primary)}
.ui-field .err{color:var(--ui-err);font-size:.82em;margin-top:3px}
.ui-tabs{display:flex;gap:2px;border-bottom:1px solid var(--ui-line)}
.ui-tabs button{font:inherit;border:0;background:none;color:var(--ui-muted);padding:8px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.ui-tabs button.active{color:var(--ui-fg);border-bottom-color:var(--ui-primary);font-weight:600}
.ui-acc{border:1px solid var(--ui-line);border-radius:var(--ui-radius);margin-bottom:6px;overflow:hidden}
.ui-acc>button{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;width:100%;padding:10px 14px;cursor:pointer;font-weight:600}
.ui-acc .body{padding:0 14px 12px;color:var(--ui-muted)}
.ui-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:50}
.ui-modal{background:var(--ui-bg);color:var(--ui-fg);border-radius:12px;min-width:min(90vw,380px);max-width:90vw;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.ui-modal header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--ui-line);font-weight:700}
.ui-modal header button{border:0;background:none;color:inherit;font-size:1.3em;cursor:pointer}.ui-modal .body{padding:16px 18px}
.ui-dd{position:relative}.ui-dd .menu{position:absolute;top:calc(100% + 4px);left:0;min-width:100%;background:var(--ui-bg);border:1px solid var(--ui-line);border-radius:var(--ui-radius);box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:20;padding:4px}
.ui-dd .menu button{all:unset;box-sizing:border-box;display:block;width:100%;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}.ui-dd .menu button:hover{background:var(--ui-soft)}
.ui-table{width:100%;border-collapse:collapse;font-size:.95em}.ui-table th,.ui-table td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--ui-line)}
.ui-table th{cursor:pointer;user-select:none;color:var(--ui-muted);font-weight:600;white-space:nowrap}.ui-table tbody tr:hover{background:var(--ui-soft)}
.ui-pager{display:flex;gap:4px;flex-wrap:wrap}.ui-pager button{font:inherit;min-width:34px;padding:5px 8px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-bg);color:var(--ui-fg);cursor:pointer}
.ui-pager button.active{background:var(--ui-primary);border-color:var(--ui-primary);color:var(--ui-primary-fg)}.ui-pager button:disabled{opacity:.4;cursor:not-allowed}
.ui-stepper{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ui-stepper .st{display:flex;align-items:center;gap:6px;color:var(--ui-muted)}
.ui-stepper .dot{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:.8em;border:1px solid var(--ui-line)}
.ui-stepper .st.done .dot,.ui-stepper .st.now .dot{background:var(--ui-primary);border-color:var(--ui-primary);color:var(--ui-primary-fg)}.ui-stepper .st.now{color:var(--ui-fg);font-weight:600}
.ui-stepper .bar{width:24px;height:2px;background:var(--ui-line)}
.ui-rating button{border:0;background:none;font-size:1.4em;cursor:pointer;color:var(--ui-line);padding:0 1px}.ui-rating button.on{color:#f5a623}
.ui-tip{position:relative;cursor:help;border-bottom:1px dotted var(--ui-muted)}
.ui-tip::after{content:attr(data-text);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#222;color:#fff;font-size:.8em;padding:4px 8px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s}
.ui-tip:hover::after{opacity:1}
.ui-toasts{position:fixed;right:16px;bottom:16px;display:grid;gap:8px;z-index:60;width:min(320px,calc(100vw - 32px))}
.ui-toast{padding:10px 14px;border-radius:var(--ui-radius);background:#222;color:#fff;border-left:4px solid var(--ui-info);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.ui-toast[data-type=success]{border-left-color:var(--ui-ok)}.ui-toast[data-type=error]{border-left-color:var(--ui-err)}.ui-toast[data-type=warning]{border-left-color:var(--ui-warn)}
`;
