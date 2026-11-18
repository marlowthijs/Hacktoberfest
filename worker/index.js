import { STUDENT_SCRIPT } from "./student-client.js";
import BUNDLED_CATALOGUE from "../data/events.json" with { type: "json" };
import { UNIVERSITY_LOGO_SVG } from "./university-logo.js";
import { SECRETARY_PAGE } from "./secretary-page.js";
import { PORTAL_SCRIPT } from "./portal-client.js";
import { handlePortalApi, mergePortalCatalogue } from "./portal-api.js";

const CATALOGUE_BASE_URL = "https://raw.githubusercontent.com/marlowthijs/Hacktoberfest/";

const PAGE = String.raw`<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#002f4c">
  <meta name="description" content="Choose University of Southampton societies and keep their upcoming events together in your calendar.">
  <title>uniflow | Southampton Societies</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#152820;background:#f4f5ed;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;--ink:#152820;--muted:#65716a;--paper:#f4f5ed;--white:#fff;--line:#dfe4da;--green:#b7ef72;--forest:#173b2c;--deep:#10291f;--orange:#fd9b63;--lilac:#dcd8f6;--shadow:0 18px 48px rgba(21,40,32,.08)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px}a{color:inherit}button{font:inherit}.skip-link{position:absolute;left:16px;top:-60px;background:#fff;padding:10px 14px;border-radius:10px;z-index:10}.skip-link:focus{top:12px}.shell{max-width:1200px;padding:0 34px;margin:auto}.topbar{height:84px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(21,40,32,.1)}.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-weight:750;letter-spacing:-.045em;font-size:19px}.brand-mark{position:relative;width:32px;height:32px;display:inline-block}.brand-mark:before,.brand-mark:after{content:"";position:absolute;border-radius:11px 11px 11px 3px;width:19px;height:19px;transform:rotate(-22deg)}.brand-mark:before{background:#b7ef72;left:1px;top:2px}.brand-mark:after{background:#173b2c;left:11px;top:11px;mix-blend-mode:multiply}.topnav{display:flex;gap:30px;align-items:center}.topnav a{font-size:13px;color:#5e6a63;text-decoration:none;font-weight:600}.topnav a:hover{color:var(--ink)}.top-cta,.button{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;text-decoration:none;font-weight:700;cursor:pointer;transition:transform .18s ease,background .18s ease}.top-cta{border-radius:999px;background:var(--forest);color:#fff;padding:12px 17px;font-size:12px}.top-cta:hover,.button-primary:hover{transform:translateY(-2px);background:#24513d}.top-cta span{font-size:16px;line-height:10px}.hero{display:grid;grid-template-columns:1.02fr .98fr;gap:58px;align-items:center;padding:72px 0 78px}.eyebrow{display:flex;align-items:center;gap:9px;color:#67746a;font-size:10px;font-weight:800;letter-spacing:.17em;text-transform:uppercase}.eyebrow-dot{width:8px;height:8px;border-radius:50%;background:#92c757;box-shadow:0 0 0 4px rgba(183,239,114,.25)}h1,h2,h3,p{margin-top:0}.hero h1{font-size:clamp(44px,6vw,74px);line-height:.99;letter-spacing:-.075em;max-width:590px;margin:25px 0 20px;font-weight:750}.hero h1 em{font-family:Georgia,serif;font-weight:500;font-style:italic;letter-spacing:-.09em;color:#648d3f}.hero-copy>p{font-size:16px;line-height:1.65;color:#65716a;max-width:450px;margin-bottom:28px}.button{border-radius:999px;padding:14px 20px;font-size:13px}.button-primary{color:white;background:var(--forest)}.button-light{background:#eef1e9;color:var(--ink)}.button-light:hover{background:#e4eadc;transform:translateY(-1px)}.hero-footnote{display:flex;align-items:center;gap:11px;margin-top:26px;color:#849087;font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.hero-footnote:before{content:"";width:30px;height:1px;background:#b8c1b7}.hero-art{min-height:360px;position:relative;display:grid;place-items:center}.art-backdrop{position:absolute;width:min(100%,450px);height:315px;border-radius:44% 56% 51% 49% / 47% 39% 61% 53%;background:#d9e8c3;transform:rotate(-7deg)}.orbit{position:absolute;border:1px solid rgba(23,59,44,.22);width:340px;height:340px;border-radius:50%;transform:rotate(-25deg) scaleY(.52)}.orbit:before,.orbit:after{content:"";position:absolute;width:11px;height:11px;border-radius:50%;background:#173b2c}.orbit:before{left:41px;top:75px}.orbit:after{right:41px;bottom:76px;background:#fd9b63}.art-card{position:relative;z-index:1;width:min(360px,86%);border-radius:22px;background:#fff;box-shadow:0 25px 60px rgba(24,51,36,.16);padding:22px 23px 20px;transform:rotate(2deg)}.art-card-head{display:flex;align-items:center;justify-content:space-between;color:#89938b;text-transform:uppercase;letter-spacing:.12em;font-size:9px;font-weight:800}.art-live{display:flex;align-items:center;gap:6px;color:#52733d}.art-live:before{content:"";width:6px;height:6px;border-radius:50%;background:#9fda5b}.art-date{display:flex;align-items:center;gap:14px;margin:25px 0 19px}.date-tile{width:54px;height:58px;border-radius:14px;background:#f1f6e9;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#44632f}.date-tile span:first-child{font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.date-tile span:last-child{font-size:23px;line-height:1.1;font-weight:760;letter-spacing:-.06em}.art-date-copy strong{font-size:17px;letter-spacing:-.04em;display:block}.art-date-copy span{color:#879087;font-size:11px;display:block;margin-top:4px}.art-event{background:#f7f8f4;border:1px solid #ebeee7;border-radius:14px;padding:14px 15px}.art-event-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.art-event-line strong{font-size:13px;letter-spacing:-.02em}.art-tag{font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;padding:6px 8px;border-radius:999px;background:#e1f2cb;color:#47652f}.art-event-meta{color:#7e887e;font-size:10px;margin-top:11px;display:flex;gap:12px;flex-wrap:wrap}.art-event-meta span:before{content:"";display:inline-block;width:5px;height:5px;vertical-align:middle;margin-right:6px;border-radius:50%;background:#a2b098}.art-caption{position:absolute;bottom:12px;right:1%;font-size:10px;color:#617260;letter-spacing:.08em;text-transform:uppercase;font-weight:750}.section-rule{height:1px;background:var(--line)}.section{padding:70px 0}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:27px}.section-kicker{font-size:10px;color:#879188;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:13px}.section-heading h2{font-size:clamp(30px,4vw,43px);letter-spacing:-.065em;line-height:1.02;margin-bottom:8px}.section-heading p{color:var(--muted);font-size:13px;margin-bottom:0}.selection-count{font-size:11px;color:#627066;background:#e8ecdf;border-radius:999px;padding:10px 13px;white-space:nowrap;font-weight:700}.society-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.society-card{position:relative;padding:20px;background:#fff;border:1px solid #e7ebe2;border-radius:18px;min-height:208px;display:flex;flex-direction:column;align-items:flex-start;box-shadow:0 6px 22px rgba(21,40,32,.025);transition:border .18s,transform .18s,box-shadow .18s}.society-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}.society-card.is-selected{border-color:#86b854;box-shadow:0 0 0 2px rgba(183,239,114,.45),var(--shadow)}.society-top{display:flex;align-items:center;justify-content:space-between;width:100%}.society-monogram{width:44px;height:44px;border-radius:15px;background:#b7ef72;display:grid;place-items:center;font-weight:850;font-size:12px;letter-spacing:-.05em;color:#29401e}.society-type{font-size:9px;color:#829087;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.society-card h3{font-size:19px;letter-spacing:-.05em;margin:18px 0 6px}.society-card p{font-size:11px;line-height:1.55;color:#77827a;max-width:260px;margin-bottom:18px}.society-bottom{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:auto;padding-top:9px;border-top:1px solid #eef0eb}.society-events{font-size:10px;color:#838d85;font-weight:650}.select-button{border:0;background:#eef1e9;color:#526055;border-radius:999px;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer}.select-button:hover{background:#e2ead6}.select-button[aria-pressed="true"]{background:#173b2c;color:#fff}.event-section{padding-top:32px}.event-list{display:grid;gap:10px}.event-card{display:grid;grid-template-columns:82px minmax(0,1fr) auto;gap:18px;align-items:center;padding:17px 20px;background:#fff;border:1px solid #e7ebe2;border-radius:16px}.event-date{border-right:1px solid #e9ece6;padding-right:15px}.event-date span{display:block}.event-date .day{font-size:21px;font-weight:800;letter-spacing:-.06em}.event-date .month{font-size:9px;color:#78837a;letter-spacing:.14em;text-transform:uppercase;font-weight:850}.event-main{min-width:0}.event-society{font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:850;color:#77965c;margin-bottom:5px}.event-main h3{font-size:15px;letter-spacing:-.03em;margin-bottom:5px}.event-main p{font-size:11px;color:#707c73;margin:0;line-height:1.5}.event-meta{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.event-meta span{display:inline-flex;align-items:center;gap:5px}.event-meta span:before{content:"";width:5px;height:5px;border-radius:50%;background:#bbc5b7}.event-label{background:#f1f5eb;color:#63794e;padding:8px 10px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}.empty-state{padding:26px 24px;border:1px dashed #cbd3c6;border-radius:16px;color:#717d73;font-size:13px;line-height:1.6;background:rgba(255,255,255,.45)}.empty-state strong{color:#344b39}.sync-section{padding:24px 0 75px}.sync-card{position:relative;overflow:hidden;border-radius:26px;background:var(--forest);color:white;padding:38px 40px 35px;display:grid;grid-template-columns:.9fr 1.1fr;gap:40px}.sync-card:after{content:"";position:absolute;right:-100px;top:-170px;width:370px;height:370px;border-radius:50%;border:1px solid rgba(183,239,114,.17);box-shadow:0 0 0 35px rgba(183,239,114,.035),0 0 0 70px rgba(183,239,114,.025);pointer-events:none}.sync-copy,.sync-steps{position:relative;z-index:1}.sync-copy .section-kicker{color:#b8d396}.sync-copy h2{font-size:clamp(28px,4vw,41px);letter-spacing:-.065em;line-height:1.03;max-width:380px;margin-bottom:15px}.sync-copy>p{max-width:390px;color:#c7d3c9;font-size:12px;line-height:1.7}.feed-status{display:inline-flex;gap:7px;align-items:center;color:#d8eac4;font-size:10px;font-weight:700;margin-top:8px}.feed-status:before{content:"";width:6px;height:6px;background:#b7ef72;border-radius:50%}.feed-box{margin-top:22px;display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.09);padding:7px 7px 7px 13px;border-radius:13px;border:1px solid rgba(255,255,255,.12);max-width:430px}.feed-url{font:10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#d4e0d4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}.copy-button{border:0;border-radius:9px;background:var(--green);color:#20331f;padding:10px 12px;font-size:10px;font-weight:850;white-space:nowrap;cursor:pointer}.copy-button:hover{background:#c9f395}.copy-button:disabled{opacity:.5;cursor:not-allowed}.feed-foot{font-size:10px;color:#b2c2b5;margin-top:10px;line-height:1.5}.sync-steps{background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:23px 25px}.sync-steps h3{font-size:13px;letter-spacing:-.02em;margin-bottom:18px}.steps{list-style:none;padding:0;margin:0;display:grid;gap:15px}.steps li{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:start;color:#c6d3c8;font-size:11px;line-height:1.5}.step-num{width:23px;height:23px;display:grid;place-items:center;border:1px solid rgba(183,239,114,.5);border-radius:50%;font-size:9px;color:#c9efa4;font-weight:800}.steps strong{display:block;color:#fff;font-size:11px;margin-bottom:2px}.google-link{display:inline-flex;align-items:center;gap:7px;margin-top:17px;color:#d9efc4;font-size:10px;font-weight:750;text-decoration:none}.google-link:hover{text-decoration:underline}.snapshot-link{display:inline-block;margin-top:13px;font-size:10px;color:#afc2b5;text-decoration:underline;text-underline-offset:3px}.privacy-note{font-size:9px;color:#93aa98;line-height:1.5;margin-top:16px}.footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 0 30px;border-top:1px solid var(--line);color:#879188;font-size:10px}.footer a{color:#5e6e61;text-decoration:none}.footer-left{display:flex;align-items:center;gap:8px}.footer-mark{width:16px;height:16px;border-radius:6px 6px 6px 2px;background:#b7ef72;transform:rotate(-18deg)}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:840px){.hero{gap:25px;padding-top:55px}.hero-art{min-height:320px}.society-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sync-card{gap:24px;padding:32px}.topnav{gap:18px}}
    @media(max-width:620px){.shell{padding:0 19px}.topbar{height:69px}.topnav{display:none}.top-cta{padding:10px 13px;font-size:10px}.brand{font-size:17px}.hero{grid-template-columns:1fr;gap:8px;padding:52px 0 55px}.hero h1{font-size:52px;max-width:470px}.hero-copy>p{font-size:14px}.hero-art{min-height:305px}.art-backdrop{height:250px}.orbit{width:290px;height:290px}.art-card{max-width:330px}.art-caption{right:3%;bottom:1px}.section{padding:54px 0}.section-heading{align-items:flex-start;flex-direction:column;margin-bottom:20px}.selection-count{align-self:flex-start}.society-grid{grid-template-columns:1fr}.society-card{min-height:190px}.event-card{grid-template-columns:62px minmax(0,1fr);gap:13px;padding:15px}.event-date{padding-right:10px}.event-label{grid-column:2;justify-self:start}.event-main h3{font-size:14px}.sync-section{padding-top:10px}.sync-card{grid-template-columns:1fr;gap:22px;padding:27px 21px;border-radius:21px}.sync-card:after{right:-190px;top:-210px}.feed-box{max-width:100%}.feed-url{font-size:9px}.footer{align-items:flex-start;flex-direction:column}.footer-right{display:flex;gap:15px}.section-heading h2{font-size:34px}}
    .society-check{display:inline-flex;align-items:center;gap:7px;color:#526055;font-size:10px;font-weight:800;cursor:pointer}.society-check input{appearance:none;width:17px;height:17px;margin:0;border:1.5px solid #aab5a6;border-radius:5px;display:grid;place-content:center;background:#fff}.society-check input:checked{background:#173b2c;border-color:#173b2c}.society-check input:checked:after{content:"✓";color:#fff;font-size:12px;line-height:1}.coming-soon{border-style:dashed;background:rgba(255,255,255,.45);justify-content:center}.coming-soon .society-monogram{background:#e8ede2!important;color:#617061;font-size:24px}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important}}
    /* University of Southampton visual refresh */
    :root{color-scheme:light;--ink:#002f4c;--muted:#526b7b;--paper:#fff;--white:#fff;--line:#d7e1e8;--green:#005c84;--forest:#002f4c;--deep:#001f33;--orange:#fcbc00;--lilac:#eaf2f7;--shadow:0 8px 24px rgba(0,47,76,.08);font-family:Arial,"Helvetica Neue",sans-serif}
    html,body{background:#fff;color:#002f4c}body{font-size:16px;line-height:1.55}.shell{max-width:1200px;padding:0 32px}
    .skip-link{background:#002f4c;color:#fff;border-radius:3px}.topbar{position:relative;isolation:isolate;height:82px;border:0;border-bottom:1px solid rgba(255,255,255,.18)}.topbar:before{content:"";position:absolute;z-index:-1;left:50%;top:0;bottom:0;width:100vw;transform:translateX(-50%);background:#002f4c}
    .brand{gap:14px;color:#fff;font-size:13px;font-weight:600;letter-spacing:0}.brand-mark{display:none}.brand-logo{display:block;width:174px;height:auto}.brand-divider{width:1px;height:30px;background:rgba(255,255,255,.42)}.brand-label{color:#fff;font-size:13px;font-weight:600;white-space:nowrap}
    .topnav{gap:28px}.topnav a{color:rgba(255,255,255,.88);font-size:13px;font-weight:600}.topnav a:hover{color:#fff;text-decoration:underline;text-underline-offset:5px}.top-cta{background:#fff;color:#002f4c;border-radius:4px;padding:11px 15px;font-size:12px}.top-cta:hover{background:#eaf2f7;transform:none}
    .hero{gap:64px;padding:72px 0 68px}.eyebrow{color:#005c84;font-size:11px;letter-spacing:.11em}.eyebrow-dot{width:6px;height:6px;background:#005c84;box-shadow:none}.hero h1{max-width:600px;color:#002f4c;font-size:clamp(42px,5.2vw,66px);font-weight:700;line-height:1.05;letter-spacing:-.045em;margin:22px 0 18px}.hero h1 em{font-family:inherit;color:#005c84;font-style:normal;font-weight:inherit;letter-spacing:inherit}.hero-copy>p{max-width:470px;color:#526b7b;font-size:16px;line-height:1.7;margin-bottom:24px}.button{border-radius:4px;padding:13px 18px;font-size:13px}.button-primary{background:#005c84;color:#fff}.button-primary:hover{background:#004668;transform:translateY(-1px)}.hero-footnote{color:#526b7b;font-size:11px;font-weight:600;letter-spacing:.02em;text-transform:none}.hero-footnote:before{background:#91a8b6}
    .hero-art{min-height:0;display:block}.art-backdrop,.orbit,.art-caption{display:none}.art-card{width:100%;max-width:470px;padding:27px;border:1px solid #d7e1e8;border-top:4px solid #005c84;border-radius:8px;box-shadow:0 8px 24px rgba(0,47,76,.08);transform:none}.art-card-head{color:#526b7b;font-size:10px;letter-spacing:.1em}.art-live{color:#005c84}.art-live:before{background:#005c84}.art-date{margin:24px 0 19px}.date-tile{width:58px;height:62px;border-radius:4px;background:#002f4c;color:#fff}.date-tile span:first-child{font-size:9px;color:#d6e6ef}.date-tile span:last-child{font-size:24px}.art-date-copy strong{color:#002f4c;font-size:18px;letter-spacing:-.02em}.art-date-copy span{color:#526b7b;font-size:12px}.art-event{background:#f4f8fa;border:1px solid #e1eaf0;border-radius:4px;padding:16px}.art-event-line strong{color:#002f4c;font-size:14px}.art-tag{background:#e2eef4;color:#005c84;border-radius:3px;font-size:9px}.art-event-meta{color:#526b7b;font-size:11px}.art-event-meta span:before{background:#8199a8}
    .section-rule{background:#d7e1e8}.section{padding:62px 0}.section-heading{margin-bottom:24px}.section-kicker{color:#005c84;font-size:10px;letter-spacing:.13em;margin-bottom:10px}.section-heading h2{color:#002f4c;font-size:clamp(29px,3.4vw,38px);line-height:1.1;letter-spacing:-.035em;margin-bottom:8px}.section-heading p{color:#526b7b;font-size:13px}.selection-count{color:#002f4c;background:#eff4f7;border:1px solid #d7e1e8;border-radius:4px;font-size:11px}
    .society-grid{gap:12px}.society-card{min-height:190px;padding:19px;background:#fff;border:1px solid #d7e1e8;border-radius:6px;box-shadow:none;transition:border-color .15s,background .15s}.society-card:hover{transform:none;box-shadow:none;border-color:#7c9bad}.society-card.is-selected{border-color:#005c84;box-shadow:inset 0 0 0 1px #005c84}.society-monogram{width:42px;height:42px;border-radius:4px;background:#e7f0f5!important;color:#002f4c;font-size:11px}.society-type{color:#526b7b;font-size:9px;letter-spacing:.1em}.society-card h3{color:#002f4c;font-size:17px;letter-spacing:-.025em;margin:16px 0 6px}.society-card p{color:#526b7b;font-size:12px;line-height:1.6}.society-bottom{border-color:#e6edf1}.society-events{color:#526b7b;font-size:11px}.select-button{border:1px solid #005c84;border-radius:4px;background:#fff;color:#005c84;padding:8px 11px;font-size:10px}.select-button:hover{background:#eff6fa}.select-button[aria-pressed="true"]{background:#002f4c;color:#fff;border-color:#002f4c}.coming-soon{background:#f8fafb}.coming-soon .society-monogram{background:#e7f0f5!important;color:#005c84}
    .event-section{padding-top:22px}.event-list{gap:9px}.event-card{grid-template-columns:72px minmax(0,1fr) auto;gap:16px;padding:16px 18px;background:#fff;border:1px solid #d7e1e8;border-left:3px solid #005c84;border-radius:5px}.event-date{border-color:#d7e1e8}.event-date .day{color:#002f4c;font-size:20px}.event-date .month{color:#005c84}.event-society{color:#005c84;letter-spacing:.11em}.event-main h3{color:#002f4c;font-size:15px;letter-spacing:-.015em}.event-main p{color:#526b7b;font-size:12px}.event-meta span:before{background:#90a7b5}.event-label{background:#eff4f7;color:#002f4c;border-radius:4px;font-size:10px}.empty-state{border-color:#b7c8d2;border-radius:5px;background:#f8fafb;color:#526b7b}.empty-state strong{color:#002f4c}
    .sync-section{padding:18px 0 64px}.sync-card{grid-template-columns:.9fr 1.1fr;gap:34px;padding:34px;background:#002f4c;border-radius:8px}.sync-card:after{display:none}.sync-copy .section-kicker{color:#c6dce8}.sync-copy h2{color:#fff;font-size:clamp(28px,3.6vw,38px);line-height:1.08;letter-spacing:-.04em}.sync-copy>p{color:#e1ebf0;font-size:12px;line-height:1.7}.feed-status{color:#fff}.feed-status:before{background:#fcbc00}.feed-box{border-radius:4px;border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.09)}.feed-url{color:#fff}.copy-button{background:#fff;color:#002f4c;border-radius:3px}.copy-button:hover{background:#eaf2f7}.copy-button:disabled{opacity:.55}.feed-foot{color:#d2e1e9}.sync-steps{border-radius:5px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}.sync-steps h3,.steps strong{color:#fff}.steps li{color:#e1ebf0}.step-num{border-color:rgba(255,255,255,.55);color:#fff}.google-link{color:#fff}.privacy-note{color:#d2e1e9}.snapshot-link{color:#fff}
    .footer{border-color:#d7e1e8;color:#526b7b;font-size:11px}.footer strong{color:#002f4c;text-transform:none}.footer a{color:#005c84;text-decoration:underline;text-underline-offset:3px}.footer-mark{display:none}.footer-left{gap:9px}.footer-right{display:flex;gap:18px;align-items:center}.brand:focus-visible,.topnav a:focus-visible,.top-cta:focus-visible,.button:focus-visible,.select-button:focus-visible,.copy-button:focus-visible,.google-link:focus-visible,.snapshot-link:focus-visible{outline:3px solid #fcbc00;outline-offset:3px}
    @media(max-width:840px){.hero{gap:34px;padding-top:58px}.sync-card{gap:24px;padding:28px}.topnav{gap:18px}}
    @media(max-width:620px){.shell{padding:0 19px}.topbar{height:68px}.brand{gap:9px}.brand-logo{width:145px}.brand-divider,.brand-label{display:none}.top-cta{padding:10px 11px;font-size:10px}.hero{grid-template-columns:1fr;gap:24px;padding:48px 0 52px}.hero h1{font-size:clamp(40px,10vw,52px)}.hero-art{padding:0}.art-card{max-width:none;padding:21px}.section{padding:48px 0}.section-heading{align-items:flex-start}.society-grid{grid-template-columns:1fr}.society-card{min-height:178px}.event-card{grid-template-columns:58px minmax(0,1fr);gap:12px;padding:14px}.event-label{grid-column:2;justify-self:start}.sync-section{padding-top:8px}.sync-card{grid-template-columns:1fr;gap:20px;padding:23px 19px;border-radius:6px}.footer{align-items:flex-start;flex-direction:column}.footer-right{flex-wrap:wrap}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important}}
    .society-card p.society-description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;max-width:100%;margin-bottom:9px}
    .society-card p.society-schedule{font-size:11px;line-height:1.45;margin:0 0 9px;color:#405f72}
    .society-links{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 10px}
    .society-links a,.event-source{color:#005c84;text-decoration:underline;text-decoration-color:#9ab5c4;text-underline-offset:3px;font-size:10px;font-weight:700}
    .society-links a:hover,.event-source:hover{text-decoration-color:#005c84}
    .society-extra{width:100%;margin:-3px 0 10px;color:#526b7b;font-size:10px}
    .society-extra summary{cursor:pointer;font-weight:700}
    .society-extra p{font-size:11px;line-height:1.5;margin:6px 0 0;white-space:normal}
    .event-main p.event-description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
    .event-source{display:inline-block;margin-top:7px}
    .society-contact{color:#005c84;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
    .catalogue-tools{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:-6px 0 18px}
    .search-field{display:flex;align-items:center;gap:10px;width:min(100%,420px);min-height:44px;padding:0 13px;border:1px solid #b7c8d2;border-radius:4px;background:#fff;color:#526b7b}
    .search-field:focus-within{outline:3px solid rgba(0,92,132,.18);border-color:#005c84}
    .search-icon{width:16px;height:16px;flex:none;color:#526b7b}
    .search-field input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#002f4c;font:inherit;font-size:13px}
    .search-field input::placeholder{color:#718694;opacity:1}
    .catalogue-result{color:#526b7b;font-size:11px}
    .list-actions{display:flex;justify-content:center;padding-top:17px}
    .list-actions[hidden]{display:none}
    .expand-button{border:1px solid #005c84;border-radius:4px;background:#fff;color:#005c84;padding:10px 16px;font-size:12px;font-weight:700;cursor:pointer}
    .expand-button:hover{background:#eff6fa}
    .expand-button:focus-visible,.search-field:focus-within{outline:3px solid rgba(0,92,132,.22);outline-offset:2px}
    .catalogue-contact{margin-top:18px;padding:13px 16px;border-left:3px solid #005c84;background:#f4f8fa;color:#526b7b;font-size:12px}
    .catalogue-contact a{color:#005c84;font-weight:700;text-underline-offset:3px}
    @media(max-width:620px){.catalogue-tools{align-items:stretch;flex-direction:column;gap:8px;margin:0 0 14px}.search-field{width:100%}.catalogue-result{font-size:11px}.list-actions{padding-top:13px}}
    /* Focus the page on completing the calendar setup. */
    .hero{grid-template-columns:1fr 390px;gap:48px;align-items:center;padding:44px 0 46px}
    .hero h1{max-width:680px;font-size:clamp(40px,5vw,60px);margin:16px 0 12px}
    .hero-copy>p{max-width:580px;margin-bottom:18px}
    .hero-footnote{margin-top:17px}
    .hero-art{display:block;min-height:0}
    .art-backdrop,.orbit,.art-caption{display:none}
    .art-card{width:100%;max-width:none;padding:20px 22px;border:1px solid #d7e1e8;border-top:4px solid #005c84;border-radius:6px;box-shadow:0 8px 24px rgba(0,47,76,.06);transform:none}
    .flow-card-title{display:flex;align-items:center;justify-content:space-between;color:#002f4c;font-size:12px;font-weight:700}
    .flow-card-title span{color:#526b7b;font-size:10px;font-weight:600}
    .flow-steps{display:grid;gap:0;margin-top:12px}
    .flow-step{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #e6edf1}
    .flow-step-number{width:27px;height:27px;display:grid;place-items:center;background:#eaf2f7;color:#005c84;font-size:11px;font-weight:700;border-radius:50%}
    .flow-step strong{display:block;color:#002f4c;font-size:12px}
    .flow-step small{display:block;color:#526b7b;font-size:10px;margin-top:2px}
    .flow-step-state{color:#526b7b;font-size:10px;white-space:nowrap}
    .section{padding:45px 0}
    .section-heading{margin-bottom:18px}
    .society-card{min-height:176px}
    .selection-next{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:20px;padding:15px 17px;border:1px solid #d7e1e8;border-left:3px solid #005c84;background:#f8fafb}
    .selection-next-copy{color:#526b7b;font-size:12px}
    .selection-next-copy strong{display:block;color:#002f4c;font-size:13px;margin-bottom:2px}
    .selection-next .button{white-space:nowrap}
    .selection-next .button:disabled{background:#e2eaf0;color:#718694;cursor:not-allowed}
    .sync-section{padding:10px 0 46px;scroll-margin-top:20px}
    .sync-card{grid-template-columns:1fr 1fr;gap:28px;padding:28px;background:#002f4c;border-radius:6px}
    .sync-copy .section-kicker{color:#fcbc00}
    .sync-copy h2{max-width:460px;margin-bottom:10px}
    .sync-copy>p{margin-bottom:12px}
    .feed-status{font-size:12px;margin:0 0 12px}
    .feed-box{display:block;margin-top:0;max-width:100%;padding:12px;background:rgba(255,255,255,.08)}
    .feed-label{display:block;color:#d2e1e9;font-size:10px;font-weight:700;margin-bottom:7px}
    .feed-url{display:block;width:100%;font-size:11px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;-webkit-user-select:all;user-select:all}
    .calendar-action{width:100%;margin-top:12px;justify-content:center;text-align:center;padding:14px 16px;background:#fff;color:#002f4c;border-radius:4px;font-size:13px}
    .calendar-action:hover{background:#eaf2f7;color:#002f4c;transform:none}
    .calendar-action:disabled{background:#b5c8d2;color:#536d7b;cursor:not-allowed;transform:none}
    .copy-guidance{min-height:42px;margin:10px 0 0;color:#e1ebf0;font-size:11px;line-height:1.55}
    .mobile-calendar-note{margin:8px 0 0;padding:10px 11px;border-left:2px solid #fcbc00;background:rgba(255,255,255,.08);color:#e1ebf0;font-size:11px;line-height:1.55;overflow-wrap:anywhere}
    .mobile-calendar-note strong{color:#fff;font-weight:700}
    .mobile-google-link{display:block;min-height:44px;padding:12px 0;color:#fff;font-size:14px;font-weight:700;text-decoration:underline;text-underline-offset:3px;-webkit-touch-callout:default;user-select:auto}
    .mobile-calendar-help{margin-top:16px;color:#e1ebf0;font-size:12px;line-height:1.6}
    .mobile-calendar-help summary{cursor:pointer;min-height:44px;padding:10px 0;font-weight:700}
    .mobile-calendar-help p{margin:0 0 10px;overflow-wrap:anywhere}
    .mobile-browser-guidance{color:#e1ebf0;font-size:12px;line-height:1.6;margin:10px 0}
    .feed-foot{margin-top:10px}
    .sync-steps{padding:21px;background:rgba(255,255,255,.08);border-radius:5px}
    .sync-steps h3{margin-bottom:14px;font-size:16px}
    .steps{gap:12px}
    .steps li{font-size:12px}
    .steps strong{font-size:12px}
    .google-link{margin-top:14px;font-size:11px}
    .privacy-note{margin-top:14px;font-size:10px}
    .event-section{padding:8px 0 42px}
    .event-details{border:1px solid #d7e1e8;border-radius:5px;background:#fff}
    .event-summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 19px;cursor:pointer;list-style:none}
    .event-summary::-webkit-details-marker{display:none}
    .event-summary:after{content:"+";color:#005c84;font-size:24px;line-height:1;font-weight:400}
    .event-details[open] .event-summary:after{content:"−"}
    .event-summary .section-kicker{display:block;margin-bottom:4px}
    .event-summary-title{display:block;color:#002f4c;font-size:18px;line-height:1.2;font-weight:700;margin-bottom:3px}
    .event-summary-text{display:block;color:#526b7b;font-size:11px}
    .event-summary .selection-count{margin-left:auto}
    .event-details-content{padding:0 19px 20px;border-top:1px solid #e6edf1}
    .selection-dock{position:fixed;z-index:20;left:0;right:0;bottom:0;display:flex;justify-content:center;padding:12px 18px calc(12px + env(safe-area-inset-bottom));background:rgba(255,255,255,.97);border-top:1px solid #d7e1e8;box-shadow:0 -6px 24px rgba(0,47,76,.1)}
    .selection-dock[hidden]{display:none}
    .selection-dock-inner{width:min(100%,1136px);display:flex;align-items:center;justify-content:space-between;gap:14px}
    .selection-dock-copy{color:#526b7b;font-size:12px}
    .selection-dock-copy strong{display:block;color:#002f4c}
    .selection-dock .button{padding:11px 16px;white-space:nowrap}
    .footer{padding-bottom:92px}
    .feedback-link{font-weight:700;white-space:nowrap}
    .button:focus-visible,.calendar-action:focus-visible,.event-summary:focus-visible{outline:3px solid #fcbc00;outline-offset:3px}
    @media(max-width:840px){.hero{grid-template-columns:1fr 330px;gap:26px;padding:38px 0}.sync-card{gap:20px;padding:23px}.section{padding:38px 0}}
    @media(max-width:760px){.hero{grid-template-columns:1fr;gap:20px}.hero-art{max-width:480px}}
    @media(max-width:620px){.hero{grid-template-columns:1fr;gap:20px;padding:34px 0}.hero h1{font-size:clamp(38px,10vw,49px)}.hero-art{max-width:none}.art-card{padding:17px}.section{padding:36px 0}.selection-next{align-items:stretch;flex-direction:column}.selection-next .button{width:100%}.sync-section{padding:6px 0 30px}.sync-card{grid-template-columns:1fr;gap:16px;padding:19px}.sync-steps{padding:17px}.event-summary{padding:15px}.event-summary .selection-count{display:none}.event-details-content{padding:0 14px 15px}.selection-dock{padding-left:12px;padding-right:12px}.selection-dock-copy{font-size:11px}.selection-dock .button{font-size:11px;padding:10px 12px}.footer{padding-bottom:100px}.footer-right{gap:12px}}
    /* On phones, put society search and selection within reach sooner. */
    @media(max-width:620px){
      .hero{gap:0;padding:23px 0 25px}
      .hero h1{font-size:clamp(37px,10vw,46px);line-height:1.04;margin:13px 0 11px}
      .hero-copy>p{max-width:36ch;font-size:14px;line-height:1.55;margin-bottom:15px}
      .hero-copy>.button{width:100%;max-width:360px;min-height:48px;border-radius:4px}
      .hero-footnote{margin-top:12px;font-size:9px;letter-spacing:.07em}
      .hero-art{display:none}
      .section#societies{padding:28px 0 36px;scroll-margin-top:12px}
      .section-heading{gap:12px;margin-bottom:14px}
      .section-heading h2{font-size:clamp(28px,8vw,34px);line-height:1.06}
      .section-heading p{font-size:13px;line-height:1.5}
      .selection-count{min-height:36px;padding:8px 11px}
      .catalogue-tools{gap:7px;margin-bottom:12px}
      .search-field{min-height:48px;padding-inline:13px}
      .search-field input{font-size:16px}
      .society-grid{gap:10px}
      .society-card{min-height:0;padding:15px;border-radius:5px}
      .society-monogram{width:38px;height:38px;border-radius:4px}
      .society-card h3{font-size:16px;margin:12px 0 5px}
      .society-card p{font-size:12px;line-height:1.5;margin-bottom:8px}
      .society-bottom{gap:8px;flex-wrap:wrap;padding-top:7px}
      .society-check{min-height:44px;padding:5px 8px;border:1px solid #b7c8d2;border-radius:4px;font-size:11px}
      .society-check input{width:20px;height:20px;border-radius:3px}
      .selection-next{margin-top:15px;padding:13px}
      .selection-next .button{min-height:48px;border-radius:4px}
      .selection-dock{padding-top:9px;padding-bottom:calc(9px + env(safe-area-inset-bottom))}
      .selection-dock .button{min-height:44px;border-radius:4px}
      .sync-section{scroll-margin-top:12px}
      .calendar-action{min-height:48px}
      body.has-selection .section#societies{padding-bottom:96px}
    }
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}

    /* Guided setup: keep one task on screen at a time. */
    .wizard-intro{max-width:760px;padding:34px 0 24px}
    .wizard-intro h1{max-width:700px;margin:13px 0 10px;color:#002f4c;font-size:clamp(40px,6vw,64px);line-height:1.02;letter-spacing:-.045em}
    .wizard-intro h1 em{color:#005c84;font-style:normal}
    .wizard-intro>p{max-width:600px;margin:0;color:#526b7b;font-size:16px;line-height:1.6}
    .wizard-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 22px;padding:0;list-style:none}
    .wizard-progress li{display:flex;align-items:center;gap:12px;min-height:62px;padding:12px 14px;border:1px solid #d7e1e8;border-radius:5px;background:#fff;color:#526b7b}
    .wizard-progress li.is-current{border-color:#005c84;background:#eaf2f7;color:#002f4c}
    .wizard-progress li.is-complete{border-color:#9fb9c6}
    .wizard-step-number{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border:1px solid #b7c8d2;border-radius:50%;font-size:14px;font-weight:700}
    .wizard-progress li.is-current .wizard-step-number,.wizard-progress li.is-complete .wizard-step-number{border-color:#005c84;background:#005c84;color:#fff}
    .wizard-progress strong{display:block;color:#002f4c;font-size:13px}
    .wizard-progress small{display:block;margin-top:2px;color:#526b7b;font-size:11px}
    .wizard-page[hidden],.wizard-intro[hidden]{display:none!important}.wizard-intro[hidden]+.wizard-progress{margin-top:24px}
    .wizard-page{animation:wizard-enter .18s ease-out}
    @keyframes wizard-enter{from{opacity:.55;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    .search-hint{margin:-4px 0 16px;color:#526b7b;font-size:12px;line-height:1.5}
    .society-card.contact-only{border-style:dashed;background:#f7f9fa}
    .society-card.contact-only .society-type{color:#526b7b}
    .contact-only-state{color:#526b7b;font-size:11px;font-weight:700;line-height:1.4}
    .society-card.contact-only .society-bottom{align-items:flex-start}
    .wizard-actions{display:flex;justify-content:space-between;gap:12px;margin-top:22px;padding-top:16px;border-top:1px solid #d7e1e8}
    .button-secondary{border:1px solid #b7c8d2;background:#fff;color:#002f4c}
    .button-secondary:hover{border-color:#005c84;background:#eaf2f7;color:#002f4c}
    .event-section{padding:10px 0 42px}
    .event-section .section-heading{margin-bottom:14px}
    .event-section .event-list{margin-bottom:14px}
    .wizard-page.sync-section{padding:10px 0 36px}
    .wizard-page.sync-section>.section-heading{margin-bottom:14px}
    .wizard-page.sync-section .sync-copy>h3{margin:0 0 8px;color:#fff;font-size:22px}
    .footer{padding-bottom:32px}
    .topnav a[aria-current="step"]{color:#002f4c;font-weight:700}
    .button:focus-visible,.calendar-action:focus-visible,.expand-button:focus-visible,.topnav a:focus-visible{outline:3px solid #fcbc00;outline-offset:3px}
    @media(max-width:620px){
      .wizard-intro{padding:23px 0 18px}
      .wizard-intro h1{font-size:clamp(36px,10vw,46px);line-height:1.04;margin:10px 0}
      .wizard-intro>p{font-size:14px;line-height:1.55}
      .wizard-progress{gap:6px;margin-bottom:15px}
      .wizard-progress li{min-height:54px;gap:7px;padding:8px 7px;border-radius:4px}
      .wizard-step-number{flex-basis:27px;width:27px;height:27px;font-size:12px}
      .wizard-progress strong{font-size:11px}
      .wizard-progress small{font-size:9px;line-height:1.25}
      .search-hint{font-size:11px;margin-top:-2px}
      .wizard-actions{flex-direction:column-reverse}
      .wizard-actions .button{width:100%;min-height:46px}
      .wizard-page.sync-section{padding:6px 0 26px}
      .footer{padding-bottom:30px}
    }
    @media(prefers-reduced-motion:reduce){.wizard-page{animation:none}}
      .society-check{color:#002f4c}
    .society-check input{border-color:#829cab;border-radius:3px}
    .society-check input:checked{background:#005c84;border-color:#005c84}
    .society-card.is-selected{border-color:#005c84;background:#f3f8fb}
    .society-monogram.has-logo{overflow:hidden;padding:3px;border:1px solid #d7e1e8;background:#fff!important}
    .society-logo{display:block;width:100%;height:100%;object-fit:contain}
    .society-monogram-fallback{font-size:inherit}
    .society-involvement{border-top:1px solid #d7e1e8;margin-top:12px;padding-top:5px;font-size:13px;color:#304e61}
    .society-involvement summary{cursor:pointer;min-height:44px;display:list-item;padding:11px 0;font-weight:700;color:#005c84}
    .society-involvement p{white-space:pre-line;overflow-wrap:anywhere;line-height:1.6;margin:4px 0 12px}
    .society-involvement a{display:inline-block;min-height:44px;padding:10px 0;color:#005c84;font-weight:700}

    /* Clear source information and compact discovery, with six more results at a time. */
    .wizard-intro{padding:34px 0 25px}.wizard-intro h1{font-size:clamp(31px,4.2vw,48px);max-width:800px;line-height:1.12}.wizard-intro p{max-width:680px}
    .freshness-note{font-size:12px;color:#526b7b;margin:0 0 18px}.discovery-tools,.event-controls,.calendar-preferences{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}.filter-chips{display:flex;flex-wrap:wrap;gap:6px}.filter-chips button,.selection-chip{font:inherit;font-size:13px;min-height:44px;padding:9px 14px;border:1px solid #c4d4df;border-radius:5px;color:#16425d;background:white;cursor:pointer}.filter-chips button[aria-pressed=true]{background:#002f4c;border-color:#002f4c;color:white}.sort-label{font-size:13px;color:#526b7b;display:flex;align-items:center;gap:8px}.sort-label select{border:1px solid #b7c8d2;border-radius:4px;min-height:44px;padding:8px 10px;color:#002f4c;background:white;font:inherit}.text-action{border:0;background:none;color:#005c84;font:inherit;font-size:13px;min-height:44px;text-decoration:underline;cursor:pointer}
    .selected-tray{border:1px solid #d7e1e8;background:#f3f7f9;border-radius:6px;padding:12px 14px;margin:0 0 20px}.selected-tray>span{font-size:12px;font-weight:700;display:block;margin-bottom:6px}#selected-chips{display:flex;gap:6px;flex-wrap:wrap}.selection-chip{font-size:12px;padding:7px 10px}.selection-chip span{padding-left:6px;font-size:18px}.next-event{padding:11px 0;border-top:1px solid #e4ebf0;min-height:65px}.next-event span{display:block;font-size:11px;color:#526b7b}.next-event strong{display:block;font-size:13px;line-height:1.4;margin-top:3px}.society-grid{align-items:start}.society-card{min-width:0}.society-card h3{font-size:18px;margin-top:10px}.society-card .society-description{font-size:13px}.society-involvement{width:100%;margin:0 0 10px}.society-involvement h4{font-size:13px;margin:14px 0 6px}.society-involvement .source-note{font-size:11px;color:#657984}.society-involvement summary{padding:10px 0}.society-links{gap:5px 12px;margin:5px 0}.society-links a{display:inline-flex;align-items:center;min-height:44px;font-size:12px}.report-link{font-size:12px}.membership-list{padding-left:16px;font-size:12px;line-height:1.5}.membership-list li{margin:10px 0}.membership-list small{display:block;color:#526b7b}.society-bottom{gap:10px;flex-wrap:wrap}.society-check{min-height:44px;font-size:13px}.society-check input{width:20px;height:20px}.source-badge{display:inline-block;font-size:11px;font-weight:600;color:#355b6e;background:#eef4f7;padding:4px 8px;border-radius:3px}.unconfirmed{color:#785717!important}.source-badge.unconfirmed{background:#fff5db}.event-description{font-size:13px;color:#526b7b;margin-top:10px}.event-description summary{cursor:pointer;min-height:44px;padding:10px 0}.event-main .event-description p{display:block;white-space:pre-line;line-height:1.6;margin:0 0 10px}.event-controls p{font-size:12px;color:#526b7b;margin:0;flex:1;max-width:540px}.unconfirmed-option{padding:12px 16px;border:1px solid #dfcfa5;background:#fffaf0;border-radius:5px;margin-bottom:20px;color:#5f4a20;font-size:13px}.unconfirmed-option summary{font-weight:600;cursor:pointer;min-height:44px;display:flex;align-items:center}.unconfirmed-option label{display:flex;align-items:flex-start;gap:9px;padding:8px 0}.unconfirmed-option input{width:20px;height:20px;flex:none}.unconfirmed-option p{margin:8px 0}.load-error{padding:14px 16px;background:#fff4df;border:1px solid #dfcfa5;border-radius:5px;font-size:13px;margin-bottom:18px}.load-error button{margin-left:12px}.calendar-preferences p{font-size:12px;color:#526b7b;max-width:600px;margin:0}.feed-url{min-height:48px;padding:11px;color:white;background:#153f59;border:1px solid #6e8a9b;border-radius:3px;font:inherit;font-size:13px}.sync-steps>p{font-size:13px;color:#e1ebf0;line-height:1.6;margin-top:15px}.feed-box .feed-label{font-size:12px}.selection-next{position:sticky;bottom:12px;z-index:4;box-shadow:0 4px 14px #002f4c12;background:#fff}.expand-button{min-height:44px}.search-field input{font-size:16px;min-height:44px}input:focus-visible,select:focus-visible,button:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #d4a000;outline-offset:3px}
    @media(max-width:620px){.wizard-intro{padding:18px 0}.wizard-intro h1{font-size:28px;margin:8px 0}.wizard-intro .eyebrow{font-size:9px}.wizard-intro>p{font-size:13px}.society-grid{gap:14px}.society-card{padding:17px}.discovery-tools{align-items:flex-start}.filter-chips{gap:5px}.filter-chips button{padding:8px 11px;font-size:12px}.sort-label{font-size:12px}.selection-next{bottom:8px;padding:12px;gap:10px}.selection-next-copy{display:none}.selection-next .button{width:100%}.society-bottom{align-items:center}.feed-url{font-size:16px}.catalogue-tools{gap:6px}.event-controls{align-items:flex-start;flex-direction:column}.calendar-preferences{align-items:stretch;flex-direction:column}.event-main{min-width:0}.sync-card{padding:20px 15px}.brand-label{display:block;font-size:16px}.brand-divider{display:block}.brand-logo{width:122px}.top-cta{display:none}.footer{padding-bottom:30px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}}
  </style>
</head>
<body>
  <a class="skip-link" href="#societies" data-go-step="1">Skip to societies</a>
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="University of Southampton uniflow home"><img class="brand-logo" src="/southampton-logo.svg" alt="University of Southampton"><span class="brand-divider" aria-hidden="true"></span><span class="brand-label">uniflow</span></a>
      <nav class="topnav" aria-label="Setup steps"><a href="#societies" data-go-step="1">Choose</a><a href="#events" data-go-step="2">Review events</a><a href="#calendar" data-go-step="3">Calendar</a></nav>
      <a class="top-cta" href="#societies" data-go-step="1">Start setup <span aria-hidden="true">→</span></a>
    </header>
    <main>
      <section class="wizard-intro" id="wizard-intro" aria-labelledby="hero-title">
        <div class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> Southampton societies &amp; sports</div>
        <h1 id="hero-title">Your societies.<br><em>One calendar.</em></h1>
        <p>Find your people. Follow their events.</p>
      </section>
      <ol class="wizard-progress" aria-label="Calendar setup steps">
        <li id="wizard-progress-1" class="is-current" aria-current="step"><span class="wizard-step-number">1</span><span><strong>Choose</strong><small>societies and sports</small></span></li>
        <li id="wizard-progress-2"><span class="wizard-step-number">2</span><span><strong>Review</strong><small>upcoming events</small></span></li>
        <li id="wizard-progress-3"><span class="wizard-step-number">3</span><span><strong>Add</strong><small>to your calendar</small></span></li>
      </ol>
      <div class="section-rule" aria-hidden="true"></div>
      <section class="section wizard-page is-current" id="societies" data-wizard-page="1" aria-labelledby="societies-title">
        <div class="section-heading"><div><div class="section-kicker">STEP 1 OF 3</div><h2 id="societies-title" tabindex="-1">Choose your societies and sports</h2><p>Browse societies with event information, or search the full directory.</p></div><div class="selection-count" id="selection-count" aria-live="polite">0 selected</div></div>
        <div class="catalogue-tools"><label class="search-field"><svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.7"></circle><path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg><span class="sr-only">Search societies by name or interest</span><input id="society-search" type="search" autocomplete="off" placeholder="Search a society, sport or interest"></label><button id="clear-search" class="text-action" hidden>Clear search</button><span class="catalogue-result" id="society-result-count" role="status" aria-live="polite">Loading societies…</span></div><p class="freshness-note" id="catalogue-freshness">Checking the latest catalogue…</p>
        <div id="load-error" class="load-error" role="status" hidden><span id="load-error-text"></span><button id="retry-load" class="text-action">Try again</button></div>
        <div class="discovery-tools"><div class="filter-chips" aria-label="Filter societies"><button data-kind="all" aria-pressed="true">All</button><button data-kind="society" aria-pressed="false">Societies</button><button data-kind="sport" aria-pressed="false">Sports</button><button id="selected-only" aria-pressed="false">My selection</button></div><label class="sort-label">Sort <select id="society-sort"><option value="next">Next event</option><option value="name">A–Z</option></select></label></div>
        <div id="selected-tray" class="selected-tray" hidden><span>Your societies</span><div id="selected-chips"></div></div>
        <div class="society-grid" id="society-grid" aria-live="polite"><div class="empty-state">Gathering the society list…</div></div>
        <div class="list-actions" id="society-actions" hidden><button class="expand-button" id="society-toggle" type="button" aria-controls="society-grid">Show 6 more</button></div>
        <div class="selection-next"><div class="selection-next-copy"><strong id="selection-next-title">Choose at least one society</strong><span id="selection-next-detail">Your event review and calendar link are in the next steps.</span></div><button class="button button-primary" id="continue-review" type="button" disabled>Continue to event review <span aria-hidden="true">→</span></button></div>
        <div class="catalogue-contact">Run a society? <a href="/secretary">Manage your events and joining details</a>. Want your society included? <a href="mailto:marlow.thijs@icloud.com?subject=Add%20my%20society%20to%20uniflow">Get in touch</a>.</div>
      </section>

      <section class="section event-section wizard-page" id="events" data-wizard-page="2" hidden aria-labelledby="events-title">
        <div class="section-heading"><div><div class="section-kicker">STEP 2 OF 3</div><h2 id="events-title" tabindex="-1">Review your upcoming events</h2><p id="event-intro">Check the upcoming events from the societies you selected.</p></div><div class="selection-count" id="event-count">Loading events</div></div>
        <div class="catalogue-tools"><label class="search-field"><svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.7"></circle><path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg><span class="sr-only">Search events by title, society, place or date</span><input id="event-search" type="search" autocomplete="off" placeholder="Search events, societies or places"></label><span class="catalogue-result" id="event-result-count" role="status" aria-live="polite">Loading events…</span></div>
        <div class="event-controls"><label class="sort-label">Dates <select id="event-range"><option value="7">Next 7 days</option><option value="30" selected>Next 30 days</option><option value="all">All upcoming</option></select></label><p>Date filters change this preview; your subscription includes all published upcoming dates.</p></div>
        <details id="unconfirmed-option" class="unconfirmed-option" hidden><summary>Dates that need confirmation</summary><p id="unconfirmed-count"></p><label><input id="include-unconfirmed" type="checkbox"> Include these unconfirmed dates in my calendar</label><p>They are labelled tentative. Times, venues or sessions may have changed; check with the society before going.</p></details>
        <div class="event-list" id="event-list" aria-live="polite"><div class="empty-state">Loading the latest events…</div></div>
        <div class="list-actions" id="event-actions" hidden><button class="expand-button" id="event-toggle" type="button" aria-controls="event-list">Show all events</button></div>
        <div class="wizard-actions"><button class="button button-secondary" id="back-to-societies" type="button">← Back to societies</button><button class="button button-primary" id="continue-calendar" type="button" disabled>Continue to calendar setup <span aria-hidden="true">→</span></button></div>
      </section>

      <section class="sync-section wizard-page" id="calendar" data-wizard-page="3" hidden aria-labelledby="calendar-title">
        <div class="section-heading"><div><div class="section-kicker">STEP 3 OF 3</div><h2 id="calendar-title" tabindex="-1">Add the events to your calendar</h2><p>Choose your calendar app, copy your link and follow the steps. You only need to set up the subscription once.</p></div></div>
        <div class="calendar-preferences"><label class="sort-label">My calendar <select id="calendar-provider"><option value="google">Google Calendar</option><option value="apple">Apple Calendar / another app</option></select></label><p id="calendar-selection-summary"></p></div>
        <p id="feed-warning" class="load-error" hidden>Your feed includes tentative dates from unconfirmed schedules.</p>
        <div class="sync-card">
          <div class="sync-copy"><h3 id="feed-heading">Copy your calendar link</h3><p>Published events refresh in your subscribed calendar. No account or access to your personal calendar needed.</p><div class="feed-status" id="feed-status" role="status" aria-live="polite">Choose at least one society to unlock your calendar link.</div>
            <div class="feed-box"><span class="feed-label">Your calendar feed link</span><input class="feed-url" id="feed-url" aria-label="Your calendar feed link" readonly placeholder="Choose a society to create your feed"></div>
            <button class="button calendar-action" id="copy-feed" type="button" disabled>Copy calendar link</button>
            <p class="copy-guidance" id="copy-guidance" role="status" aria-live="polite">Copy your link, then follow the calendar setup steps.</p>
            <p class="mobile-calendar-note" id="mobile-calendar-note" hidden>Google Calendar’s app cannot add calendar subscriptions. Use the browser steps below to try its desktop website on your phone.</p>
            <div class="feed-foot">Anyone with your link can view the selected public society events. Your choices are saved in this browser.</div>
            <a class="snapshot-link" id="download-feed" href="#" aria-disabled="true">Download a one-time .ics file instead</a>
          </div>
          <div class="sync-steps" id="desktop-calendar-steps"><h3>2. Add it to Google Calendar</h3><ol class="steps"><li><span class="step-num">1</span><span><strong>Choose “From URL”</strong>In Google Calendar, open “Other calendars” and choose “+”, then “From URL”.</span></li><li><span class="step-num">2</span><span><strong>Paste your copied link</strong>Paste it into the URL field and select “Add calendar”.</span></li></ol><a class="google-link" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Open Google Calendar <span aria-hidden="true">↗</span></a><p class="privacy-note">This adds a separate calendar subscription. It does not edit your primary calendar, and Google may take a little time to refresh new events.</p></div>
          <div class="sync-steps" id="apple-calendar-steps" hidden><h3>2. Subscribe in your calendar</h3><a class="button calendar-action" id="apple-subscribe" href="#" aria-disabled="true">Open in Apple Calendar ↗</a><p>Confirm the subscription in Calendar to receive future updates. Or open Calendar → Calendars → Add Calendar → Add Subscription Calendar, then paste the link.</p><p>For another calendar app, choose its option to subscribe to a calendar by URL, then paste your copied link.</p><p class="privacy-note">A subscription stays connected. A one-time file download will not receive future changes.</p></div>
          <div class="sync-steps" id="mobile-calendar-steps" hidden>
            <h3 id="mobile-finish-title">Finish in your browser</h3>
            <ol class="steps">
              <li><span class="step-num">2</span><span><strong>Press and hold the website link</strong>Choose “Open in New Tab” from the menu, then switch to that tab.<a class="mobile-google-link" id="mobile-google-link" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer" aria-describedby="mobile-browser-guidance">Google Calendar website ↗</a></span></li>
              <li><span class="step-num">3</span><span><strong id="desktop-site-title">Request the desktop website</strong><span id="desktop-site-guidance">In your browser’s menu, turn on “Desktop site”. Sign in to the same Google account you use in the app.</span></span></li>
              <li><span class="step-num">4</span><span><strong>Paste your calendar link</strong>In Google Calendar, choose Settings → Add calendar → From URL. Paste your UniFlow link and select “Add calendar”.</span></li>
            </ol>
            <p class="mobile-browser-guidance" id="mobile-browser-guidance" role="status" aria-live="polite">Copy your link first, then press and hold “Google Calendar website”.</p>
            <details class="mobile-calendar-help"><summary>Still opening the app?</summary><p>Type <strong>calendar.google.com</strong> directly into your browser’s address bar, then request the desktop website. Return to this tab to copy your feed link again if needed.</p><p>If Google does not show “From URL” in desktop view, complete this one-time setup on a computer using your feed link above. The subscribed calendar can then appear in the Google Calendar app.</p></details>
          </div>
        </div>
        <div class="wizard-actions"><button class="button button-secondary" id="back-to-events" type="button">← Back to event review</button></div>
      </section>
    </main>
    <footer class="footer"><div class="footer-left"><strong>uniflow</strong><span>·</span><span>Student-run project; not an official University service.</span></div><div class="footer-right"><span id="updated-label">Source dates shown on society profiles</span><a class="feedback-link" href="mailto:marlow.thijs@icloud.com?subject=UniFlow%20feedback">Feedback: marlow.thijs@icloud.com</a><a href="https://github.com/marlowthijs/Hacktoberfest" target="_blank" rel="noopener noreferrer">Project on GitHub ↗</a></div></footer>
  </div>
  <div class="sr-only" id="announcement" aria-live="polite"></div>
  <script>${STUDENT_SCRIPT}
  </script>
</body>
</html>`;

function validateCatalogue(value) {
  if (!value || value.schema_version !== 1 || !Array.isArray(value.societies) || !Array.isArray(value.events)) {
    throw new Error("Invalid event catalogue");
  }
  const societies = value.societies.filter((society) =>
    society && typeof society.id === "string" && typeof society.name === "string",
  );
  const societyIds = new Set(societies.map((society) => society.id));
  const events = value.events.filter((event) =>
    event && typeof event.id === "string" && typeof event.title === "string"
    && societyIds.has(event.society_id) && Number.isFinite(Date.parse(event.start))
    && Number.isFinite(Date.parse(event.end)) && Date.parse(event.end) > Date.parse(event.start),
  );
  return {
    schema_version: 1,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : null,
    refresh: value.refresh || null,
    societies,
    events,
  };
}

function catalogueUrlForRequest(request, env = {}) {
  const ref = env.CATALOGUE_REF || "main";
  return CATALOGUE_BASE_URL + ref + "/data/events.json";
}

async function loadBaseCatalogue(request, env = {}, strict = false) {
  const hostname = new URL(request.url).hostname;
  if (!env.CATALOGUE_REF && (env.CATALOGUE_SOURCE === "bundled" || ["localhost", "127.0.0.1", "[::1]"].includes(hostname) || hostname.endsWith(".workers.dev"))) return validateCatalogue(BUNDLED_CATALOGUE);
  try {
    const interval = Math.floor(Date.now() / 300000);
    const response = await fetch(catalogueUrlForRequest(request, env) + "?v=" + interval, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Catalogue request failed");
    return validateCatalogue(await response.json());
  } catch (error) {
    if (strict) throw error;
    return validateCatalogue(BUNDLED_CATALOGUE);
  }
}

async function loadCatalogue(request, env) {
  // An unavailable catalogue must not publish an incomplete feed to subscribers.
  return mergePortalCatalogue(await loadBaseCatalogue(request, env, Boolean(env.PORTAL_DB)), env);
}

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const chunks = [];
  let chunk = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 73) {
      chunks.push(chunk);
      chunk = " " + character;
      bytes = 1 + size;
    } else {
      chunk += character;
      bytes += size;
    }
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendar(events, origin, societyNames) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//uniflow//Campus Society Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:uniflow - " + escapeIcs(societyNames.join(", ")),
    "X-WR-TIMEZONE:Europe/London",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + encodeURIComponent(event.id) + "@society-synth",
      "DTSTAMP:" + icsDate(event.modified_at || new Date().toISOString()),
      "SEQUENCE:" + (Number.isSafeInteger(event.sequence) ? event.sequence : Number.isSafeInteger(event.version) ? event.version : 0),
      "DTSTART:" + icsDate(event.start),
      "DTEND:" + icsDate(event.end),
      "SUMMARY:" + escapeIcs((event.verification_status === "needs_confirmation" ? "[Unconfirmed] " : "") + event.title),
    );
    if (event.modified_at) lines.push("LAST-MODIFIED:" + icsDate(event.modified_at));
    if (event.status === "cancelled") lines.push("STATUS:CANCELLED");
    else if (event.verification_status === "needs_confirmation") lines.push("STATUS:TENTATIVE");
    if (event.location) lines.push("LOCATION:" + escapeIcs(event.location));
    if (event.description || event.verification_status === "needs_confirmation") lines.push("DESCRIPTION:" + escapeIcs((event.verification_status === "needs_confirmation" ? "This date has not been confirmed in the latest source check. Check with the society before attending.\n\n" : "") + (event.description || "")));
    let eventUrl = origin + "/";
    try { const source = new URL(event.source_url); if (["https:", "http:"].includes(source.protocol) && !source.username && !source.password) eventUrl = source.href; } catch {}
    lines.push("URL:" + escapeIcs(eventUrl), "END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return lines.map(foldIcsLine).join("\r\n");
}

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    try {
    if (url.pathname.startsWith("/api/portal/")) return await handlePortalApi(request, env, { loadBaseCatalogue: () => loadBaseCatalogue(request, env, true) });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", ...securityHeaders } });
    }
    if (["/secretary", "/secretary/", "/secretary/admin", "/secretary/admin/"].includes(url.pathname)) {
      return new Response(request.method === "HEAD" ? null : SECRETARY_PAGE, { headers: {
        "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...securityHeaders,
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' mailto:",
        "x-frame-options": "DENY",
      } });
    }
    if (url.pathname === "/assets/portal.js") {
      return new Response(request.method === "HEAD" ? null : PORTAL_SCRIPT, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store", ...securityHeaders } });
    }
    if (url.pathname === "/southampton-logo.svg") {
      return new Response(request.method === "HEAD" ? null : UNIVERSITY_LOGO_SVG, {
        headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400", ...securityHeaders },
      });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(request.method === "HEAD" ? null : PAGE, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60", ...securityHeaders },
      });
    }
    if (url.pathname === "/healthz") {
      return new Response(request.method === "HEAD" ? null : "ok", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
      });
    }
    if (url.pathname === "/api/events") {
      const catalogue = await loadCatalogue(request, env);
      return new Response(request.method === "HEAD" ? null : JSON.stringify(catalogue), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=300", "access-control-allow-origin": "*", ...securityHeaders },
      });
    }
    if (url.pathname === "/calendar.ics") {
      const selected = (url.searchParams.get("societies") || "").split(",").map((id) => id.trim()).filter(Boolean);
      if (!selected.length) {
        return new Response("Choose at least one society in uniflow to create a calendar feed.", {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
        });
      }
      const catalogue = await loadCatalogue(request, env);
      const societyIds = new Set(selected);
      const societies = catalogue.societies.filter((society) => societyIds.has(society.id));
      if (!societies.length) {
        return new Response("No matching society calendars were found.", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
        });
      }
      const events = catalogue.events.filter((event) => societyIds.has(event.society_id) && (event.verification_status !== "needs_confirmation" || url.searchParams.get("include_unconfirmed") === "1" || event.status === "cancelled"));
      const body = buildCalendar(events, url.origin, societies.map((society) => society.name));
      const headers = {
        "content-type": "text/calendar; charset=utf-8; method=PUBLISH",
        "cache-control": "public, max-age=300, s-maxage=300",
        "content-disposition": url.searchParams.get("download") === "1" ? "attachment; filename=\"uniflow.ics\"" : "inline",
        "access-control-allow-origin": "*",
        ...securityHeaders,
      };
      return new Response(request.method === "HEAD" ? null : body, { headers });
    }
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", ...securityHeaders } });
    } catch (error) {
      console.error("Catalogue unavailable:", error.name);
      return new Response("Society updates are temporarily unavailable. Please try again shortly.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders } });
    }
  },
};
