import { UNIVERSITY_LOGO_SVG } from "./university-logo.js";
import { SECRETARY_PAGE } from "./secretary-page.js";
import { PORTAL_SCRIPT } from "./portal-client.js";
import { handlePortalApi, mergePortalCatalogue } from "./portal-api.js";

const FALLBACK_CATALOGUE = {
  schema_version: 1,
  updated_at: "2026-10-24T12:00:00Z",
  societies: [
    {
      id: "ecss",
      name: "ECSS",
      description: "Society events, collected in one easy-to-follow calendar.",
      accent: "#b7ef72",
    },
    {
      id: "mma",
      name: "MMA",
      description: "Striking, grappling and full MMA sessions.",
      accent: "#f6b6c8",
    },
    {
      id: "cyber-security",
      name: "Cyber Security",
      description: "Weekly cyber sessions, CTFs and practical workshops.",
      accent: "#b9d8ff",
    },
    {
      id: "boxing",
      name: "Boxing",
      description: "Training, sparring, socials and hill sprints.",
      accent: "#ffd1b9",
    },
  ],
  events: [
    {
      id: "hacktoberfest-2026",
      society_id: "ecss",
      title: "Hacktoberfest",
      start: "2026-10-24T09:45:00+01:00",
      end: "2026-10-24T20:00:00+01:00",
      timezone: "Europe/London",
      location: "Building 60 West",
      description: "hackathon",
    },
    {
      id: "ecss-chatgpt-workshop-2026-10-26",
      society_id: "ecss",
      title: "ChatGPT workshop",
      start: "2026-10-26T18:00:00+00:00",
      end: "2026-10-26T20:00:00+00:00",
      timezone: "Europe/London",
      location: "Building 100, Room 4013",
      description: "An ECSS workshop on using ChatGPT.",
    },
    {
      id: "ecss-halloween-pub-crawl-2026-10-29",
      society_id: "ecss",
      title: "Halloween pub crawl",
      start: "2026-10-29T19:15:00+00:00",
      end: "2026-10-29T22:15:00+00:00",
      timezone: "Europe/London",
      location: "The Stag's",
      description: "Costumes encouraged.",
    },
    {
      id: "mma-training-2026-10-31",
      society_id: "mma",
      title: "MMA training",
      start: "2026-10-31T11:30:00+00:00",
      end: "2026-10-31T13:30:00+00:00",
      timezone: "Europe/London",
      location: "Jubilee Sports Centre",
      description: "Weekly MMA training session.",
    },
    {
      id: "cyber-security-weekly-2026-10-28",
      society_id: "cyber-security",
      title: "Weekly Cyber Security session",
      start: "2026-10-28T18:00:00+00:00",
      end: "2026-10-28T20:00:00+00:00",
      timezone: "Europe/London",
      location: "To be announced",
      description: "Regular weekly session; venue details are to be announced.",
    },
    {
      id: "boxing-general-training-2026-10-26",
      society_id: "boxing",
      title: "General training",
      start: "2026-10-26T20:00:00+00:00",
      end: "2026-10-26T21:30:00+00:00",
      timezone: "Europe/London",
      location: "Glen Eyre Hall",
      description: "All abilities welcome.",
    },
  ],
};

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
    .wizard-page[hidden]{display:none!important}
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
      <section class="wizard-intro" aria-labelledby="hero-title">
        <div class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> University of Southampton · student societies and sports</div>
        <h1 id="hero-title">Your campus.<br><em>In your calendar.</em></h1>
        <p>Choose the clubs you follow, check their upcoming events, then add your calendar in three simple steps.</p>
      </section>
      <ol class="wizard-progress" aria-label="Calendar setup steps">
        <li id="wizard-progress-1" class="is-current" aria-current="step"><span class="wizard-step-number">1</span><span><strong>Choose</strong><small>societies and sports</small></span></li>
        <li id="wizard-progress-2"><span class="wizard-step-number">2</span><span><strong>Review</strong><small>upcoming events</small></span></li>
        <li id="wizard-progress-3"><span class="wizard-step-number">3</span><span><strong>Add</strong><small>to your calendar</small></span></li>
      </ol>
      <div class="section-rule" aria-hidden="true"></div>
      <section class="section wizard-page is-current" id="societies" data-wizard-page="1" aria-labelledby="societies-title">
        <div class="section-heading"><div><div class="section-kicker">STEP 1 OF 3</div><h2 id="societies-title" tabindex="-1">Choose your societies and sports</h2><p>Pick the calendars you want to follow. Only clubs with upcoming event listings appear here; search for a club to find its contact details.</p></div><div class="selection-count" id="selection-count" aria-live="polite">0 selected</div></div>
        <div class="catalogue-tools"><label class="search-field"><svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.7"></circle><path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg><span class="sr-only">Search societies by name</span><input id="society-search" type="search" autocomplete="off" placeholder="Search societies"></label><span class="catalogue-result" id="society-result-count" role="status" aria-live="polite">Loading societies…</span></div><p class="search-hint">No event calendar showing? Search the society or sport by name to find its SUSU and contact links.</p>
        <div class="society-grid" id="society-grid" aria-live="polite"><div class="empty-state">Gathering the society list…</div></div>
        <div class="list-actions" id="society-actions" hidden><button class="expand-button" id="society-toggle" type="button" aria-controls="society-grid" aria-expanded="false">Show all societies</button></div>
        <div class="selection-next"><div class="selection-next-copy"><strong id="selection-next-title">Choose at least one society</strong><span id="selection-next-detail">Your event review and calendar link are in the next steps.</span></div><button class="button button-primary" id="continue-review" type="button" disabled>Continue to event review <span aria-hidden="true">→</span></button></div>
        <div class="catalogue-contact">Run a society? <a href="/secretary">Manage your events and joining details</a>. Want your society included? <a href="mailto:marlow.thijs@icloud.com?subject=Add%20my%20society%20to%20uniflow">Get in touch</a>.</div>
      </section>

      <section class="section event-section wizard-page" id="events" data-wizard-page="2" hidden aria-labelledby="events-title">
        <div class="section-heading"><div><div class="section-kicker">STEP 2 OF 3</div><h2 id="events-title" tabindex="-1">Review your upcoming events</h2><p id="event-intro">Check the upcoming events from the societies you selected.</p></div><div class="selection-count" id="event-count">Loading events</div></div>
        <div class="catalogue-tools"><label class="search-field"><svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.7"></circle><path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg><span class="sr-only">Search events by title, society, place or date</span><input id="event-search" type="search" autocomplete="off" placeholder="Search events, societies or places"></label><span class="catalogue-result" id="event-result-count" role="status" aria-live="polite">Loading events…</span></div>
        <div class="event-list" id="event-list" aria-live="polite"><div class="empty-state">Loading the latest events…</div></div>
        <div class="list-actions" id="event-actions" hidden><button class="expand-button" id="event-toggle" type="button" aria-controls="event-list" aria-expanded="false">Show all events</button></div>
        <div class="wizard-actions"><button class="button button-secondary" id="back-to-societies" type="button">← Back to societies</button><button class="button button-primary" id="continue-calendar" type="button" disabled>Continue to calendar setup <span aria-hidden="true">→</span></button></div>
      </section>

      <section class="sync-section wizard-page" id="calendar" data-wizard-page="3" hidden aria-labelledby="calendar-title">
        <div class="section-heading"><div><div class="section-kicker">STEP 3 OF 3</div><h2 id="calendar-title" tabindex="-1">Add the events to your calendar</h2><p>Copy the link for your selected clubs, then paste it into Google Calendar.</p></div></div>
        <div class="sync-card">
          <div class="sync-copy"><h3 id="feed-heading">Copy your calendar link</h3><p>Your feed stays current as societies publish more events.</p><div class="feed-status" id="feed-status" role="status" aria-live="polite">Choose at least one society to unlock your calendar link.</div>
            <div class="feed-box"><span class="feed-label">Your calendar feed link</span><span class="feed-url" id="feed-url">Choose a society above to create your feed</span></div>
            <button class="button calendar-action" id="copy-feed" type="button" disabled>Copy link &amp; open Google Calendar <span aria-hidden="true">↗</span></button>
            <p class="copy-guidance" id="copy-guidance" role="status" aria-live="polite">After choosing societies, use the button to copy your link and open Google Calendar.</p>
            <p class="mobile-calendar-note" id="mobile-calendar-note" hidden>Google Calendar’s app cannot add calendar subscriptions. Use the browser steps below to try its desktop website on your phone.</p>
            <div class="feed-foot">Anyone with your link can view the selected public society events. Your choices are saved in this browser.</div>
            <a class="snapshot-link" id="download-feed" href="#" aria-disabled="true">Download a one-time .ics file instead</a>
          </div>
          <div class="sync-steps" id="desktop-calendar-steps"><h3>Finish in the Google Calendar browser tab</h3><ol class="steps"><li><span class="step-num">1</span><span><strong>Choose “From URL”</strong>In Google Calendar, open “Other calendars” and choose “+”, then “From URL”.</span></li><li><span class="step-num">2</span><span><strong>Paste your copied link</strong>Paste it into the URL field and select “Add calendar”.</span></li></ol><a class="google-link" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Open Google Calendar manually <span aria-hidden="true">↗</span></a><p class="privacy-note">This adds a separate calendar subscription. It does not edit your primary calendar, and Google may take a little time to refresh new events.</p></div>
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
    <footer class="footer"><div class="footer-left"><strong>uniflow</strong><span>·</span><span>Student-run project; not an official University service.</span></div><div class="footer-right"><span id="updated-label">Society catalogue curated weekly</span><a class="feedback-link" href="mailto:marlow.thijs@icloud.com?subject=UniFlow%20feedback">Feedback: marlow.thijs@icloud.com</a><a href="https://github.com/marlowthijs/Hacktoberfest" target="_blank" rel="noopener noreferrer">Project on GitHub ↗</a></div></footer>
  </div>
  <div class="sr-only" id="announcement" aria-live="polite"></div>
  <script>
    (function(){
      "use strict";
      var KEY="society-synth:selected-societies:v1";
      var catalogue={societies:[],events:[],updated_at:null};
      var selected=new Set(readSavedSelection());
      var societyExpanded=false;
      var eventExpanded=false;
      var grid=document.getElementById("society-grid");
      var list=document.getElementById("event-list");
      var societySearch=document.getElementById("society-search");
      var eventSearch=document.getElementById("event-search");
      var societyActions=document.getElementById("society-actions");
      var societyToggle=document.getElementById("society-toggle");
      var eventActions=document.getElementById("event-actions");
      var eventToggle=document.getElementById("event-toggle");
      var feedUrl=document.getElementById("feed-url");
      var copyButton=document.getElementById("copy-feed");
      var downloadLink=document.getElementById("download-feed");
      var continueButton=document.getElementById("continue-review");
      var continueCalendarButton=document.getElementById("continue-calendar");
      var backToSocietiesButton=document.getElementById("back-to-societies");
      var backToEventsButton=document.getElementById("back-to-events");
      var wizardPages=Array.from(document.querySelectorAll("[data-wizard-page]"));
      var activeStep=1;
      var mobileCalendarNote=document.getElementById("mobile-calendar-note");
      var mobileCalendarSteps=document.getElementById("mobile-calendar-steps");
      var desktopCalendarSteps=document.getElementById("desktop-calendar-steps");
      var mobileBrowserGuidance=document.getElementById("mobile-browser-guidance");
      var copiedFeed="";
      var failedCopyFeed="";
      var copyInProgress=false;
      var GOOGLE_CALENDAR_SETTINGS_URL="https://calendar.google.com/calendar/u/0/r/settings/addbyurl";

      function isAppleMobile(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);}
      function isMobileCalendarSetup(){return isAppleMobile()||/Android/i.test(navigator.userAgent)||!!(window.matchMedia&&window.matchMedia("(hover: none) and (pointer: coarse)").matches);}
      function updateCalendarDeviceHelp(){
        var mobile=isMobileCalendarSetup(),apple=isAppleMobile();
        mobileCalendarNote.hidden=!mobile;
        mobileCalendarSteps.hidden=!mobile;
        desktopCalendarSteps.hidden=mobile;
        document.getElementById("feed-heading").textContent=mobile?"1. Copy your calendar link":"Copy your calendar link";
        document.getElementById("mobile-finish-title").textContent=apple?"Finish in Safari":"Finish in your browser";
        document.getElementById("desktop-site-title").textContent=apple?"Request Desktop Website":"Turn on Desktop site";
        document.getElementById("desktop-site-guidance").textContent=apple?"In Safari, open the Page menu beside the address bar, then choose “Request Desktop Website” (under More on some versions). Sign in to the same Google account you use in the app.":"In Chrome, open the three-dot menu and turn on “Desktop site”. Sign in to the same Google account you use in the app.";
        return mobile;
      }
      updateCalendarDeviceHelp();

      function readSavedSelection(){try{var saved=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(saved)?saved.filter(function(id){return typeof id==="string";}):[];}catch(_){return [];}}
      function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
      function safeExternalUrl(value){try{var url=new URL(String(value||""));return url.protocol==="https:"||url.protocol==="http:"?url.href:"";}catch(_){return "";}}
      function externalAnchor(label,value){var href=safeExternalUrl(value);return href?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';}
      function societyLinks(society){var links=[];if(society.instagram_url)links.push(externalAnchor("Instagram",society.instagram_url));if(society.contact_email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(society.contact_email))links.push('<a href="mailto:'+esc(society.contact_email)+'">Email</a>');if(society.website_url){var host="";try{host=new URL(society.website_url).hostname;}catch(_){}links.push(externalAnchor(/linktr\.ee|beacons\.ai|solo\.to/i.test(host)?"More links":"Website",society.website_url));}if(society.community_url){var host="";try{host=new URL(society.community_url).hostname;}catch(_){}links.push(externalAnchor(/whatsapp/i.test(host)?"WhatsApp group":/discord/i.test(host)?"Discord":"Group link",society.community_url));}if(society.susu_url)links.push(externalAnchor("SUSU profile",society.susu_url));links=links.filter(Boolean);return links.length?'<div class="society-links" aria-label="Society contact links">'+links.join("")+'</div>':'';}
      function fmtDate(value,zone,options){return new Intl.DateTimeFormat("en-GB",Object.assign({timeZone:zone||"Europe/London"},options)).format(new Date(value));}
      function eventTime(event){return fmtDate(event.start,event.timezone,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"})+" — "+fmtDate(event.end,event.timezone,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"});}
      function eventDate(event){return {day:fmtDate(event.start,event.timezone,{day:"2-digit"}),month:fmtDate(event.start,event.timezone,{month:"short"}),weekday:fmtDate(event.start,event.timezone,{weekday:"long"}),full:fmtDate(event.start,event.timezone,{weekday:"long",day:"numeric",month:"long",year:"numeric"})};}
      function searchText(value){return String(value||"").toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function upcomingEventCount(id){return catalogue.events.filter(function(event){return event.society_id===id&&event.status!=="cancelled"&&new Date(event.end).getTime()>=Date.now();}).length;}
      function hasUpcomingEvents(id){return upcomingEventCount(id)>0;}
      function visibleEvents(){var chosen=selected.size?catalogue.events.filter(function(event){return selected.has(event.society_id);}):catalogue.events;return chosen.filter(function(event){return event.status!=="cancelled"&&new Date(event.end).getTime()>=Date.now();}).sort(function(a,b){return new Date(a.start)-new Date(b.start);});}
      function societyFor(id){return catalogue.societies.find(function(society){return society.id===id;})||{name:id};}
      function renderSocieties(){
        document.getElementById("selection-count").textContent=selected.size+" selected";
        if(!catalogue.societies.length){document.getElementById("society-result-count").textContent="No societies listed";societyActions.hidden=true;grid.innerHTML='<div class="empty-state">No societies are listed yet. Check back after the next catalogue update.</div>';return;}
        var query=searchText(societySearch.value).trim();
        var matches=catalogue.societies.filter(function(society){
          var hasEvents=hasUpcomingEvents(society.id);
          if(!query)return hasEvents;
          var specific=[society.name,society.id,society.instagram_url,society.website_url,society.community_url,society.susu_url].join(" ");
          if(!hasEvents)return searchText(specific).indexOf(query)!==-1;
          var text=[specific,society.description,society.instagram_bio,society.regular_schedule,society.contact_email].join(" ");
          return searchText(text).indexOf(query)!==-1;
        });
        var visible=societyExpanded?matches:matches.slice(0,6);
        document.getElementById("society-result-count").textContent=matches.length?("Showing "+visible.length+" of "+matches.length+(query?" search matches":" societies with upcoming events")):(query?"No societies found":"No upcoming event listings yet");
        societyActions.hidden=matches.length<=6;
        societyToggle.textContent=societyExpanded?"Show fewer results":(query?"Show all "+matches.length+" results":"Show all "+matches.length+" societies with events");
        societyToggle.setAttribute("aria-expanded",String(societyExpanded));
        if(!matches.length){grid.innerHTML=query?'<div class="empty-state"><strong>No societies match that search.</strong><br>Try another name, sport or contact detail.</div>':'<div class="empty-state"><strong>No event listings are available right now.</strong><br>Search for a society or sport to see its official contact details.</div>';return;}
        grid.innerHTML=visible.map(function(society){
          var count=upcomingEventCount(society.id),hasEvents=count>0,active=hasEvents&&selected.has(society.id);
          var initials=Array.from(society.name).slice(0,4).join("");
          var description=society.description||"Check the official SUSU profile for current society and contact information.";
          var schedule=society.regular_schedule?'<p class="society-schedule"><strong>Regular activities:</strong> '+esc(society.regular_schedule)+'</p>':'';
          var bio=society.instagram_bio&&searchText(society.instagram_bio)!==searchText(description)?'<details class="society-extra"><summary>Instagram bio</summary><p>'+esc(society.instagram_bio)+'</p></details>':'';
          var joining=society.how_to_join||safeExternalUrl(society.membership_url)?'<details class="society-involvement"><summary>How to get involved</summary>'+(society.how_to_join?'<p>'+esc(society.how_to_join)+'</p>':'')+externalAnchor("Join or find out more",society.membership_url)+'</details>':'';
          var isSport=society.category==="sport"||society.id==="boxing"||society.id==="mma";
          var type=isSport?(society.sport_format==="intramural"?"Intramural sport":"Sports club"):"Society calendar";
          var selection=hasEvents?'<label class="society-check"><input type="checkbox" data-society="'+esc(society.id)+'" '+(active?'checked':'')+'><span>Add to my calendar</span></label>':'<span class="contact-only-state">Contact details only · no upcoming events listed</span>';
          var eventText=hasEvents?count+' upcoming '+(count===1?'event':'events'):'Contact information';
          var logo=safeExternalUrl(society.logo_url);
          var monogram=logo?'<div class="society-monogram has-logo" aria-hidden="true"><img class="society-logo" src="'+esc(logo)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="society-monogram-fallback" hidden>'+esc(initials)+'</span></div>':'<div class="society-monogram" style="background:'+esc(society.accent||"#dceaf2")+'" aria-hidden="true">'+esc(initials)+'</div>';
          return '<article class="society-card'+(active?' is-selected':'')+(!hasEvents?' contact-only':'')+'"><div class="society-top">'+monogram+'<span class="society-type">'+esc(type)+'</span></div><h3>'+esc(society.name)+'</h3><p class="society-description">'+esc(description)+'</p>'+joining+schedule+bio+societyLinks(society)+'<div class="society-bottom"><span class="society-events">'+esc(eventText)+'</span>'+selection+'</div></article>';
        }).join("");
        grid.querySelectorAll(".society-logo").forEach(function(image){
          function restoreInitials(){var mark=image.parentElement;if(!mark)return;image.hidden=true;mark.classList.remove("has-logo");var fallback=mark.querySelector(".society-monogram-fallback");if(fallback)fallback.hidden=false;}
          image.addEventListener("error",restoreInitials,{once:true});
          if(image.complete&&!image.naturalWidth)restoreInitials();
        });
        grid.querySelectorAll("[data-society]").forEach(function(check){check.addEventListener("change",function(){var id=check.getAttribute("data-society");if(!hasUpcomingEvents(id)){check.checked=false;return;}if(check.checked){selected.add(id);}else{selected.delete(id);}try{localStorage.setItem(KEY,JSON.stringify(Array.from(selected)));}catch(_){}render();document.getElementById("announcement").textContent=selected.has(id)?societyFor(id).name+" added to your calendar feed.":societyFor(id).name+" removed from your calendar feed.";});});
      }
      function renderEvents(){
        var events=visibleEvents();
        document.getElementById("event-intro").textContent=selected.size?"Upcoming events from "+selected.size+" selected society "+(selected.size===1?"calendar.":"calendars."):"Choose a society with an upcoming event to review its listings.";
        document.getElementById("event-count").textContent=events.length+" upcoming "+(events.length===1?"event":"events");
        var query=searchText(eventSearch.value).trim();
        var matches=events.filter(function(event){if(!query)return true;var society=societyFor(event.society_id),date=eventDate(event);var haystack=event.title+" "+society.name+" "+(event.location||"")+" "+(event.description||"")+" "+date.full+" "+eventTime(event);return searchText(haystack).indexOf(query)!==-1;});
        var visible=eventExpanded?matches:matches.slice(0,6);
        document.getElementById("event-result-count").textContent=matches.length?("Showing "+visible.length+" of "+matches.length+" events"):"No events found";
        eventActions.hidden=matches.length<=6;
        eventToggle.textContent=eventExpanded?"Show fewer events":"Show all "+matches.length+" events";
        eventToggle.setAttribute("aria-expanded",String(eventExpanded));
        if(!matches.length){list.innerHTML=query?'<div class="empty-state"><strong>No events match that search.</strong><br>Try a different title, society, place or date.</div>':'<div class="empty-state"><strong>No upcoming events for these choices.</strong><br>Go back and choose a society with upcoming listings.</div>';return;}
        list.innerHTML=visible.map(function(event){var society=societyFor(event.society_id),date=eventDate(event);var meta='<span>'+esc(eventTime(event))+'</span>'+(event.location?'<span>'+esc(event.location)+'</span>':'');var source=externalAnchor("Event details",event.source_url);
          return '<article class="event-card"><div class="event-date"><span class="day">'+esc(date.day)+'</span><span class="month">'+esc(date.month)+'</span></div><div class="event-main"><div class="event-society">'+esc(society.name)+'</div><h3>'+esc(event.title)+'</h3><p class="event-meta">'+meta+'</p>'+(event.description?'<p class="event-description">'+esc(event.description)+'</p>':'')+source+'</div><span class="event-label">'+esc(date.weekday)+'</span></article>';
        }).join("");
      }
      function renderFeed(){
        var mobile=updateCalendarDeviceHelp();
        var ids=Array.from(selected).filter(function(id){return catalogue.societies.some(function(s){return s.id===id;})&&hasUpcomingEvents(id);}).sort();
        var count=ids.length;
        document.getElementById("selection-count").textContent=count+" selected";
        continueButton.disabled=!count;
        continueCalendarButton.disabled=!count;
        document.getElementById("selection-next-title").textContent=count?count+" societ"+(count===1?"y":"ies")+" selected":"Choose at least one society";
        document.getElementById("selection-next-detail").textContent=count?"Step 2 reviews their upcoming events; step 3 adds them to your calendar.":"Choose societies with upcoming event listings to continue.";
        if(!count){
          feedUrl.textContent="Choose a society above to create your feed";
          copyButton.disabled=true;
          copyButton.textContent=mobile?"Copy calendar link":"Copy link & open Google Calendar";
          downloadLink.href="#";
          downloadLink.setAttribute("aria-disabled","true");
          document.getElementById("feed-status").textContent="Choose at least one society to unlock your calendar link.";
          document.getElementById("copy-guidance").textContent=mobile?"Choose societies to create your calendar link, then follow the browser steps below.":"After choosing societies, use the button to copy your link and open Google Calendar.";
          mobileBrowserGuidance.textContent="Copy your link first, then press and hold “Google Calendar website”.";
          return;
        }
        var url=new URL("/calendar.ics",window.location.origin);
        url.searchParams.set("societies",ids.join(","));
        feedUrl.textContent=url.href;
        var copied=copiedFeed===url.href,failed=failedCopyFeed===url.href;
        copyButton.disabled=copyInProgress;
        copyButton.textContent=copyInProgress?"Copying…":copied?"Link copied ✓ — copy again":mobile?"Copy calendar link":"Copy link & open Google Calendar";
        downloadLink.href=url.href+"&download=1";
        downloadLink.removeAttribute("aria-disabled");
        document.getElementById("feed-status").textContent=copied?"Calendar link copied. Ready for the next step.":failed?"Automatic copying failed. Select and copy the feed link above.":count+" societ"+(count===1?"y":"ies")+" selected · ready to add";
        document.getElementById("copy-guidance").textContent=failed?(mobile?"Press and hold the feed link above, then choose Copy. Continue with the browser steps once you have copied it.":"Select and copy the feed link above, then paste it in Google Calendar under “From URL”."):copied?(mobile?"Next: press and hold “Google Calendar website” below, then choose “Open in New Tab”.":"In the Google Calendar tab, paste your copied link under “From URL” and select “Add calendar”."):(mobile?"This button copies your feed link. Follow the steps below to add it in your browser.":"Your link is ready. The button copies it and opens the Google Calendar URL screen.");
        mobileBrowserGuidance.textContent=copied?"Link copied. Press and hold the website link above, choose “Open in New Tab”, then switch to that tab.":"Copy your link first, then press and hold “Google Calendar website”.";
      }
            function render(){renderSocieties();renderEvents();renderFeed();}
      function showStep(step){if(step<1||step>3)return;if(step>1&&!selected.size){document.getElementById("announcement").textContent="Choose at least one society with upcoming events before continuing.";return;}activeStep=step;wizardPages.forEach(function(page){var current=Number(page.getAttribute("data-wizard-page"))===step;page.hidden=!current;page.classList.toggle("is-current",current);});[1,2,3].forEach(function(number){var item=document.getElementById("wizard-progress-"+number);if(!item)return;item.classList.toggle("is-current",number===step);item.classList.toggle("is-complete",number<step);if(number===step)item.setAttribute("aria-current","step");else item.removeAttribute("aria-current");});document.querySelectorAll("[data-go-step]").forEach(function(link){if(Number(link.getAttribute("data-go-step"))===step)link.setAttribute("aria-current","step");else link.removeAttribute("aria-current");});window.scrollTo({top:0,behavior:"smooth"});var page=document.querySelector("[data-wizard-page=\""+step+"\"]");var heading=page&&page.querySelector("h2");if(heading)heading.focus({preventScroll:true});}
      async function load(){try{var response=await fetch("/api/events",{cache:"no-store"});if(!response.ok)throw new Error("catalogue unavailable");var next=await response.json();if(!Array.isArray(next.societies)||!Array.isArray(next.events))throw new Error("invalid catalogue");catalogue=next;selected=new Set(Array.from(selected).filter(function(id){return hasUpcomingEvents(id);}));try{localStorage.setItem(KEY,JSON.stringify(Array.from(selected)));}catch(_){}var label=document.getElementById("updated-label");if(catalogue.updated_at){var updated=new Date(catalogue.updated_at);if(!Number.isNaN(updated.getTime()))label.textContent="Catalogue updated "+new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Europe/London"}).format(updated);}render();}catch(_){document.getElementById("society-result-count").textContent="Societies unavailable";document.getElementById("event-result-count").textContent="Events unavailable";grid.innerHTML='<div class="empty-state">We couldn’t load the society list right now. Please refresh in a moment.</div>';list.innerHTML='<div class="empty-state">Event updates are temporarily unavailable.</div>';}}
      societySearch.addEventListener("input",function(){societyExpanded=false;renderSocieties();});
      eventSearch.addEventListener("input",function(){eventExpanded=false;renderEvents();});
      societyToggle.addEventListener("click",function(){societyExpanded=!societyExpanded;renderSocieties();});
      eventToggle.addEventListener("click",function(){eventExpanded=!eventExpanded;renderEvents();});
      continueButton.addEventListener("click",function(){showStep(2);});
      continueCalendarButton.addEventListener("click",function(){showStep(3);});
      backToSocietiesButton.addEventListener("click",function(){showStep(1);});
      backToEventsButton.addEventListener("click",function(){showStep(2);});
      document.querySelectorAll("[data-go-step]").forEach(function(link){link.addEventListener("click",function(event){event.preventDefault();showStep(Number(link.getAttribute("data-go-step")));});});
      document.getElementById("mobile-google-link").addEventListener("click",function(event){
        // Preserve Safari's native long-press menu; an ordinary tap can launch the app.
        event.preventDefault();
        mobileBrowserGuidance.textContent="Press and hold this link, then choose “Open in New Tab” from your browser’s menu. A normal tap can open the Calendar app.";
      });
      copyButton.addEventListener("click",async function(){
        if(copyButton.disabled)return;
        var link=feedUrl.textContent;
        var mobile=isMobileCalendarSetup();
        if(!mobile)window.open(GOOGLE_CALENDAR_SETTINGS_URL,"_blank","noopener,noreferrer");
        copyInProgress=true;
        renderFeed();
        var copied=false;
        try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(link);copied=true;}}catch(_){}
        if(!copied){
          var input=document.createElement("textarea");
          input.value=link;
          input.setAttribute("readonly","");
          input.style.position="fixed";
          input.style.opacity="0";
          input.style.fontSize="16px";
          document.body.appendChild(input);
          input.focus({preventScroll:true});
          input.select();
          input.setSelectionRange(0,input.value.length);
          try{copied=document.execCommand("copy");}catch(_){}
          input.remove();
        }
        copyInProgress=false;
        if(copied){
          copiedFeed=link;
          failedCopyFeed="";
          document.getElementById("announcement").textContent=mobile?"Calendar link copied. Next, press and hold the Google Calendar website link and choose Open in New Tab.":"Calendar link copied. Paste it in Google Calendar using From URL, then choose Add calendar.";
        }else{
          copiedFeed="";
          failedCopyFeed=link;
          document.getElementById("announcement").textContent="Automatic copying failed. Select and copy the feed link above, then continue with the browser steps.";
        }
        renderFeed();
        copyButton.focus({preventScroll:true});
      });
      load();window.addEventListener("focus",load);window.addEventListener("resize",renderFeed);setInterval(load,300000);
    })();
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
    societies,
    events,
  };
}

function catalogueUrlForRequest(request, env = {}) {
  const ref = env.CATALOGUE_REF || "main";
  return CATALOGUE_BASE_URL + ref + "/data/events.json";
}

async function loadBaseCatalogue(request, env = {}, strict = false) {
  try {
    const interval = Math.floor(Date.now() / 300000);
    const response = await fetch(catalogueUrlForRequest(request, env) + "?v=" + interval, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Catalogue request failed");
    return validateCatalogue(await response.json());
  } catch (error) {
    if (strict) throw error;
    return FALLBACK_CATALOGUE;
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
      "SEQUENCE:" + (Number.isSafeInteger(event.version) ? event.version : 0),
      "DTSTART:" + icsDate(event.start),
      "DTEND:" + icsDate(event.end),
      "SUMMARY:" + escapeIcs(event.title),
    );
    if (event.modified_at) lines.push("LAST-MODIFIED:" + icsDate(event.modified_at));
    if (event.status === "cancelled") lines.push("STATUS:CANCELLED");
    if (event.location) lines.push("LOCATION:" + escapeIcs(event.location));
    if (event.description) lines.push("DESCRIPTION:" + escapeIcs(event.description));
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
      const events = catalogue.events.filter((event) => societyIds.has(event.society_id));
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
