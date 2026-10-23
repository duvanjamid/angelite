/* AngeLite UI stylesheet. Theme it with the --ui-* variables on :root (or any ancestor); dark mode follows the system
   unless <html data-theme="light|dark"> says otherwise. */
export const css = `
:root{--ui-bg:#fff;--ui-fg:#1b2430;--ui-muted:#566074;--ui-line:#dde2ea;--ui-soft:#f3f5f8;--ui-primary:#3d6c6f;--ui-primary-fg:#fff;--ui-accent:#ef7b4f;--ui-ok:#277a4c;--ui-warn:#a65d00;--ui-err:#c0392b;--ui-info:#2d65c8;--ui-radius:8px;--ui-font:inherit;--ui-ring:0 0 0 3px color-mix(in srgb,var(--ui-primary) 35%,transparent);--ui-shadow:0 12px 32px rgba(15,23,42,.18)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--ui-bg:#14181f;--ui-fg:#e8ecf2;--ui-muted:#9aa5b8;--ui-line:#2a303c;--ui-soft:#1c222c;--ui-primary:#72a2ac;--ui-primary-fg:#0f171a;--ui-ok:#5cc08a;--ui-warn:#e0a13a;--ui-err:#f0766a;--ui-info:#7fa8f0;--ui-shadow:0 12px 32px rgba(0,0,0,.5)}}
:root[data-theme=dark]{--ui-bg:#14181f;--ui-fg:#e8ecf2;--ui-muted:#9aa5b8;--ui-line:#2a303c;--ui-soft:#1c222c;--ui-primary:#72a2ac;--ui-primary-fg:#0f171a;--ui-ok:#5cc08a;--ui-warn:#e0a13a;--ui-err:#f0766a;--ui-info:#7fa8f0;--ui-shadow:0 12px 32px rgba(0,0,0,.5)}
ui-button,ui-badge,ui-chip,ui-avatar,ui-tooltip,ui-toggle,ui-rating,ui-dropdown,ui-popover,ui-spinner,ui-checkbox{display:inline-block}
ui-card,ui-alert,ui-progress,ui-skeleton,ui-tabs,ui-accordion-item,ui-table,ui-pagination,ui-stepper,ui-text-field,ui-textarea,ui-select,ui-combobox,ui-slider,ui-radio-group,ui-breadcrumb,ui-empty-state,ui-code-block,ui-divider,ui-toasts{display:block}
:where(.ui-btn,.ui-toggle,.ui-chip button,.ui-pager button,.ui-tabs button,.ui-acc>button,.ui-dd .menu button,.ui-rating button,.ui-th,.ui-code button,.ui-pop>button,.ui-combo li,.ui-crumbs a,.ui-modal header button,.ui-drawer header button,.ui-alert button,.ui-tip):focus-visible{outline:none;box-shadow:var(--ui-ring)}
.ui-btn{font:var(--ui-font);display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 14px;border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-bg);color:var(--ui-fg);cursor:pointer;transition:border-color .15s,background .15s;line-height:1.3}
.ui-btn:hover:not(:disabled){border-color:var(--ui-primary)}
.ui-btn:disabled{opacity:.5;cursor:not-allowed}
.ui-btn[data-variant=primary]{background:var(--ui-primary);border-color:var(--ui-primary);color:var(--ui-primary-fg)}
.ui-btn[data-variant=accent]{background:var(--ui-accent);border-color:var(--ui-accent);color:#1b1208}
.ui-btn[data-variant=danger]{background:var(--ui-err);border-color:var(--ui-err);color:#fff}
.ui-btn[data-variant=ghost]{border-color:transparent;background:transparent}
.ui-btn[data-variant=ghost]:hover:not(:disabled){background:var(--ui-soft);border-color:transparent}
.ui-btn[data-size=sm]{padding:3px 9px;font-size:.85em}.ui-btn[data-size=lg]{padding:11px 20px;font-size:1.1em}.ui-btn[data-block=true]{display:flex;width:100%}
ui-button[block]{display:block}
.ui-badge{display:inline-flex;align-items:center;gap:5px;font-size:.75em;font-weight:600;padding:2px 9px;border-radius:99px;background:var(--ui-soft);color:var(--ui-fg);border:1px solid var(--ui-line)}
.ui-badge[data-variant=primary]{background:var(--ui-primary);color:var(--ui-primary-fg);border-color:transparent}
.ui-badge[data-variant=success]{background:var(--ui-ok);color:#fff;border-color:transparent}.ui-badge[data-variant=warning]{background:var(--ui-warn);color:#fff;border-color:transparent}.ui-badge[data-variant=danger]{background:var(--ui-err);color:#fff;border-color:transparent}.ui-badge[data-variant=info]{background:var(--ui-info);color:#fff;border-color:transparent}
.ui-badge .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.ui-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 10px;border-radius:99px;border:1px solid var(--ui-line);background:var(--ui-soft);font-size:.88em}
.ui-chip[data-removable=false]{padding-right:10px}.ui-chip[data-variant=primary]{background:color-mix(in srgb,var(--ui-primary) 16%,var(--ui-bg));border-color:var(--ui-primary)}
.ui-chip button{border:0;background:none;color:inherit;cursor:pointer;border-radius:50%;width:20px;height:20px;line-height:1;font-size:1.05em}.ui-chip button:hover{background:var(--ui-line)}
.ui-card{border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-bg);overflow:hidden}
.ui-card h4{margin:0;padding:12px 16px;border-bottom:1px solid var(--ui-line);font-size:1em}.ui-card .body{padding:14px 16px}.ui-card .foot{padding:10px 16px;border-top:1px solid var(--ui-line);background:var(--ui-soft)}.ui-card .foot:empty{display:none}
.ui-alert{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:var(--ui-radius);border:1px solid var(--ui-line);border-left:4px solid var(--ui-info);background:var(--ui-soft)}
.ui-alert[data-type=success]{border-left-color:var(--ui-ok)}.ui-alert[data-type=warning]{border-left-color:var(--ui-warn)}.ui-alert[data-type=error]{border-left-color:var(--ui-err)}
.ui-alert .msg{flex:1}.ui-alert .ttl{display:block;font-weight:700;margin-bottom:2px}.ui-alert button{border:0;background:none;color:inherit;cursor:pointer;font-size:1.2em;line-height:1;border-radius:4px}
.ui-avatar{display:inline-grid;place-items:center;border-radius:50%;background:var(--ui-primary);color:var(--ui-primary-fg);font-weight:700;overflow:hidden;position:relative;vertical-align:middle}
.ui-avatar[data-shape=square]{border-radius:var(--ui-radius)}.ui-avatar img{width:100%;height:100%;object-fit:cover}
.ui-avatar .st{position:absolute;right:0;bottom:0;width:28%;height:28%;border-radius:50%;border:2px solid var(--ui-bg);background:var(--ui-muted)}.ui-avatar .st[data-s=online]{background:var(--ui-ok)}.ui-avatar .st[data-s=busy]{background:var(--ui-err)}.ui-avatar .st[data-s=away]{background:var(--ui-warn)}
.ui-spinner{display:inline-block;width:1.2em;height:1.2em;border:2px solid var(--ui-line);border-top-color:var(--ui-primary);border-radius:50%;animation:ui-spin .7s linear infinite;vertical-align:middle}
@keyframes ui-spin{to{transform:rotate(360deg)}}
.ui-progress-wrap .lbl{display:flex;justify-content:space-between;font-size:.85em;color:var(--ui-muted);margin-bottom:4px}
.ui-progress{height:8px;border-radius:99px;background:var(--ui-soft);overflow:hidden;border:1px solid var(--ui-line)}.ui-progress i{display:block;height:100%;background:var(--ui-primary);transition:width .3s}
.ui-progress[data-variant=success] i{background:var(--ui-ok)}.ui-progress[data-variant=warning] i{background:var(--ui-warn)}.ui-progress[data-variant=danger] i{background:var(--ui-err)}
.ui-progress[data-indeterminate=true] i{width:40%;animation:ui-ind 1.2s ease-in-out infinite}
@keyframes ui-ind{0%{margin-left:-40%}100%{margin-left:100%}}
.ui-skeleton{height:1em;border-radius:6px;background:linear-gradient(90deg,var(--ui-soft),var(--ui-line),var(--ui-soft));background-size:200% 100%;animation:ui-sk 1.2s infinite}.ui-skeleton[data-circle=true]{border-radius:50%}
@keyframes ui-sk{to{background-position:-200% 0}}
@media(prefers-reduced-motion:reduce){.ui-spinner,.ui-skeleton,.ui-progress[data-indeterminate=true] i{animation-duration:3s}}
.ui-divider{display:flex;align-items:center;gap:10px;color:var(--ui-muted);font-size:.85em;margin:12px 0}.ui-divider::before,.ui-divider::after{content:"";flex:1;border-top:1px solid var(--ui-line)}
.ui-divider[data-plain=true]::before{display:none}.ui-divider[data-plain=true]::after{display:none}.ui-divider[data-plain=true]{border-top:1px solid var(--ui-line);height:0;margin:12px 0}
.ui-empty{text-align:center;padding:28px 16px;border:1px dashed var(--ui-line);border-radius:var(--ui-radius);color:var(--ui-muted)}.ui-empty h4{margin:0 0 4px;color:var(--ui-fg)}.ui-empty p{margin:0 0 12px}
.ui-toggle{font:var(--ui-font);display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:0;background:none;color:var(--ui-fg);padding:2px}.ui-toggle:disabled{opacity:.5;cursor:not-allowed}
.ui-toggle .track{width:38px;height:22px;border-radius:99px;background:var(--ui-line);position:relative;transition:background .15s;flex:none}
.ui-toggle .track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
.ui-toggle[data-on=true] .track{background:var(--ui-primary)}.ui-toggle[data-on=true] .track::after{transform:translateX(16px)}
.ui-field{display:block}.ui-field label.lbl{display:block;font-size:.85em;color:var(--ui-muted);margin-bottom:4px}.ui-field label.lbl .req{color:var(--ui-err)}
.ui-field input:not([type=checkbox]):not([type=radio]):not([type=range]),.ui-field select,.ui-field textarea{width:100%;box-sizing:border-box;font:var(--ui-font);padding:8px 10px;border:1px solid var(--ui-line);border-radius:var(--ui-radius);background:var(--ui-bg);color:var(--ui-fg)}
.ui-field textarea{resize:vertical;min-height:4.5em}
.ui-field input:focus,.ui-field select:focus,.ui-field textarea:focus{outline:none;border-color:var(--ui-primary);box-shadow:var(--ui-ring)}
.ui-field input:disabled,.ui-field select:disabled,.ui-field textarea:disabled{opacity:.55;cursor:not-allowed;background:var(--ui-soft)}
.ui-field[data-invalid=true] input,.ui-field[data-invalid=true] select,.ui-field[data-invalid=true] textarea{border-color:var(--ui-err)}
.ui-field .err{color:var(--ui-err);font-size:.82em;margin-top:3px}.ui-field .hint{color:var(--ui-muted);font-size:.82em;margin-top:3px}
.ui-check{display:inline-flex;align-items:center;gap:8px;cursor:pointer}.ui-check input{width:1.1em;height:1.1em;accent-color:var(--ui-primary);margin:0}
.ui-check[data-disabled=true]{opacity:.55;cursor:not-allowed}
.ui-radios{border:0;margin:0;padding:0}.ui-radios legend{font-size:.85em;color:var(--ui-muted);padding:0;margin-bottom:6px}.ui-radios label{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer}.ui-radios input{accent-color:var(--ui-primary);margin:0}
.ui-slider{display:flex;align-items:center;gap:12px}.ui-slider input{flex:1;accent-color:var(--ui-primary)}.ui-slider output{min-width:2.5em;text-align:right;font-variant-numeric:tabular-nums;color:var(--ui-muted)}
.ui-combo{position:relative}.ui-combo ul{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 4px);margin:0;padding:4px;list-style:none;max-height:220px;overflow:auto;background:var(--ui-bg);border:1px solid var(--ui-line);border-radius:var(--ui-radius);box-shadow:var(--ui-shadow)}
.ui-combo li{padding:6px 10px;border-radius:6px;cursor:pointer}.ui-combo li[aria-selected=true]{background:var(--ui-soft);outline:1px solid var(--ui-line)}.ui-combo li[data-current=true]{font-weight:700}.ui-combo li.none{color:var(--ui-muted);cursor:default}
.ui-tabs{display:flex;gap:2px;border-bottom:1px solid var(--ui-line);overflow-x:auto}
.ui-tabs button{font:var(--ui-font);border:0;background:none;color:var(--ui-muted);padding:9px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.ui-tabs button:hover{color:var(--ui-fg)}.ui-tabs button.active{color:var(--ui-fg);border-bottom-color:var(--ui-primary);font-weight:600}
.ui-crumbs ol{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none;font-size:.92em}.ui-crumbs li{display:flex;align-items:center;gap:4px;color:var(--ui-muted)}.ui-crumbs li+li::before{content:attr(data-sep);opacity:.6}
.ui-crumbs a{color:var(--ui-muted);text-decoration:none;border-radius:4px}.ui-crumbs a:hover{color:var(--ui-fg);text-decoration:underline}.ui-crumbs [aria-current]{color:var(--ui-fg);font-weight:600}
.ui-acc{border:1px solid var(--ui-line);border-radius:var(--ui-radius);margin-bottom:6px;overflow:hidden}
.ui-acc>button{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;gap:8px;width:100%;padding:11px 14px;cursor:pointer;font-weight:600}.ui-acc>button:focus-visible{box-shadow:inset var(--ui-ring)}
.ui-acc .body{padding:0 14px 12px;color:var(--ui-muted)}
.ui-backdrop{position:fixed;inset:0;background:rgba(8,12,18,.55);display:grid;place-items:center;z-index:1000;padding:16px}
.ui-modal{background:var(--ui-bg);color:var(--ui-fg);border-radius:12px;width:min(100%,440px);max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:var(--ui-shadow);outline:none}
.ui-modal[data-size=sm]{width:min(100%,340px)}.ui-modal[data-size=lg]{width:min(100%,720px)}
.ui-modal header,.ui-drawer header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px 18px;border-bottom:1px solid var(--ui-line);font-weight:700}
.ui-modal header button,.ui-drawer header button{border:0;background:none;color:inherit;font-size:1.3em;cursor:pointer;border-radius:6px;line-height:1;padding:2px 6px}
.ui-modal .body,.ui-drawer .body{padding:16px 18px;overflow:auto}
.ui-drawer-wrap{position:fixed;inset:0;background:rgba(8,12,18,.55);z-index:1000;display:flex}
.ui-drawer{background:var(--ui-bg);color:var(--ui-fg);display:flex;flex-direction:column;box-shadow:var(--ui-shadow);outline:none;width:min(88vw,360px);height:100%;animation:ui-in-l .2s ease both}
.ui-drawer-wrap[data-side=right]{justify-content:flex-end}.ui-drawer-wrap[data-side=right] .ui-drawer{animation-name:ui-in-r}
.ui-drawer-wrap[data-side=bottom]{align-items:flex-end}.ui-drawer-wrap[data-side=bottom] .ui-drawer{width:100%;height:auto;max-height:80vh;border-radius:14px 14px 0 0;animation-name:ui-in-b}
@keyframes ui-in-l{from{transform:translateX(-100%)}}@keyframes ui-in-r{from{transform:translateX(100%)}}@keyframes ui-in-b{from{transform:translateY(100%)}}
@media(prefers-reduced-motion:reduce){.ui-drawer{animation:none}}
.ui-dd,.ui-pop{position:relative;display:inline-block}
.ui-dd .menu,.ui-pop .panel{position:absolute;top:calc(100% + 4px);left:0;min-width:100%;background:var(--ui-bg);border:1px solid var(--ui-line);border-radius:var(--ui-radius);box-shadow:var(--ui-shadow);z-index:40;padding:4px}
.ui-pop .panel{min-width:220px;padding:12px 14px}.ui-pop[data-placement=top] .panel{top:auto;bottom:calc(100% + 4px)}.ui-pop[data-align=end] .panel,.ui-dd[data-align=end] .menu{left:auto;right:0}
.ui-dd .menu button{all:unset;box-sizing:border-box;display:block;width:100%;padding:7px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}.ui-dd .menu button:hover,.ui-dd .menu button:focus-visible{background:var(--ui-soft)}.ui-dd .menu button[aria-disabled=true]{opacity:.5;cursor:not-allowed}
.ui-table-wrap{overflow-x:auto;border:1px solid var(--ui-line);border-radius:var(--ui-radius)}
.ui-table{width:100%;border-collapse:collapse;font-size:.95em}.ui-table caption{caption-side:top;text-align:left;padding:10px 12px;font-weight:700}
.ui-table th,.ui-table td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--ui-line)}.ui-table[data-dense=true] th,.ui-table[data-dense=true] td{padding:5px 10px}
.ui-table th{color:var(--ui-muted);font-weight:600;white-space:nowrap;background:var(--ui-soft)}.ui-table tr:last-child td{border-bottom:0}
.ui-table[data-striped=true] tbody tr:nth-child(even){background:var(--ui-soft)}.ui-table tbody tr:hover{background:var(--ui-soft)}.ui-table td.empty{text-align:center;color:var(--ui-muted);padding:22px}
.ui-th{all:unset;box-sizing:border-box;cursor:pointer;user-select:none;display:inline-flex;gap:4px;font-weight:600;color:var(--ui-muted);border-radius:4px}.ui-th:hover{color:var(--ui-fg)}
.ui-pager{display:flex;gap:4px;flex-wrap:wrap;align-items:center}.ui-pager button{font:var(--ui-font);min-width:34px;padding:5px 9px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-bg);color:var(--ui-fg);cursor:pointer}
.ui-pager button:hover:not(:disabled):not(.active){border-color:var(--ui-primary)}.ui-pager button.active{background:var(--ui-primary);border-color:var(--ui-primary);color:var(--ui-primary-fg)}.ui-pager button:disabled{opacity:.4;cursor:not-allowed}.ui-pager .gap{padding:0 4px;color:var(--ui-muted)}
.ui-stepper{display:flex;gap:8px;align-items:center;flex-wrap:wrap;list-style:none;margin:0;padding:0}.ui-stepper .st{display:flex;align-items:center;gap:6px;color:var(--ui-muted)}
.ui-stepper .dot{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.8em;border:1px solid var(--ui-line)}
.ui-stepper .st.done .dot,.ui-stepper .st.now .dot{background:var(--ui-primary);border-color:var(--ui-primary);color:var(--ui-primary-fg)}.ui-stepper .st.now{color:var(--ui-fg);font-weight:600}
.ui-stepper .bar{width:24px;height:2px;background:var(--ui-line)}
.ui-rating{display:inline-flex}.ui-rating button{border:0;background:none;font-size:1.5em;cursor:pointer;color:var(--ui-line);padding:0 1px;border-radius:4px;line-height:1}.ui-rating button.on{color:#e8a317}.ui-rating[data-readonly=true] button{cursor:default}
.ui-tip{position:relative;display:inline-block;cursor:help;border-bottom:1px dotted var(--ui-muted)}.ui-tip .tip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1d2530;color:#fff;font-size:.8em;padding:4px 9px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:50}
.ui-tip[data-placement=bottom] .tip{bottom:auto;top:calc(100% + 6px)}.ui-tip[data-placement=left] .tip{bottom:auto;left:auto;right:calc(100% + 6px);top:50%;transform:translateY(-50%)}.ui-tip[data-placement=right] .tip{bottom:auto;left:calc(100% + 6px);top:50%;transform:translateY(-50%)}
.ui-tip:hover .tip,.ui-tip:focus .tip,.ui-tip:focus-within .tip{opacity:1}
.ui-toasts{position:fixed;right:16px;bottom:16px;display:grid;gap:8px;z-index:1100;width:min(340px,calc(100vw - 32px));pointer-events:none}
.ui-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:var(--ui-radius);border:1px solid var(--ui-line);border-left:4px solid var(--ui-info);background:var(--ui-bg);color:var(--ui-fg);box-shadow:var(--ui-shadow)}
.ui-toast[data-type=success]{border-left-color:var(--ui-ok)}.ui-toast[data-type=warning]{border-left-color:var(--ui-warn)}.ui-toast[data-type=error]{border-left-color:var(--ui-err)}
.ui-toast .m{flex:1}.ui-toast button{border:0;background:none;color:inherit;cursor:pointer;font-size:1.1em;line-height:1;border-radius:4px}
.ui-code{border:1px solid var(--ui-line);border-radius:var(--ui-radius);overflow:hidden;background:var(--ui-soft)}.ui-code .bar{display:flex;justify-content:space-between;align-items:center;padding:4px 8px 4px 12px;border-bottom:1px solid var(--ui-line);font-size:.8em;color:var(--ui-muted)}
.ui-code button{font:var(--ui-font);border:1px solid var(--ui-line);background:var(--ui-bg);color:var(--ui-fg);border-radius:6px;padding:2px 9px;cursor:pointer}.ui-code pre{margin:0;padding:12px 14px;overflow-x:auto;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ui-fg)}
`;
