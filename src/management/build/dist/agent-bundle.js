#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// shared/protocol.js
var require_protocol = __commonJS({
  "shared/protocol.js"(exports2, module2) {
    "use strict";
    var HEARTBEAT_INTERVAL_MS2 = 3e3;
    var STALE_AFTER_MS = 1e4;
    function heartbeatResponse({ ok, disabled, config, reason }) {
      const body = { ok, disabled: !!disabled };
      if (disabled) body.reason = reason || "disabled";
      if (config) body.config = config;
      return body;
    }
    module2.exports = { HEARTBEAT_INTERVAL_MS: HEARTBEAT_INTERVAL_MS2, STALE_AFTER_MS, heartbeatResponse };
  }
});

// agent/ui.js
var require_ui = __commonJS({
  "agent/ui.js"(exports2, module2) {
    "use strict";
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    function statusFile(configDir) {
      return path2.join(configDir, "status.json");
    }
    function setUi2(configDir, patch) {
      try {
        let cur = {};
        try {
          cur = JSON.parse(fs2.readFileSync(statusFile(configDir), "utf8"));
        } catch {
        }
        const next = Object.assign({}, cur, patch, { ts: Date.now() });
        fs2.mkdirSync(configDir, { recursive: true });
        fs2.writeFileSync(statusFile(configDir), JSON.stringify(next));
      } catch {
      }
    }
    module2.exports = { setUi: setUi2, statusFile };
  }
});

// agent/brain-i18n.js
var require_brain_i18n = __commonJS({
  "agent/brain-i18n.js"(exports2, module2) {
    "use strict";
    var MARKERS = {
      es: /\b(hola|buenos dias|buenas tardes|buenas noches|si|sí|no me interesa|no gracias|gracias|por favor|señor|señora|camion|camionero|dispatch|mi nombre es|me llamo|estoy ocupado|no me llame)\b/i,
      fr: /\b(bonjour|bonsoir|oui|non merci|non|merci|monsieur|madame|je m' appelle|je suis|pas intéressé|ne me rappelez pas|conducteur|camon|occupé|s'il vous plaît)\b/i,
      de: /\b(hallo|guten tag|guten morgen|guten abend|ja|nein danke|nein|danke|herr|frau|ich heisse|ich bin|nicht interessiert|rufen sie mich nicht an|fahrer|lkw|beschäftigt|bitte)\b/i,
      pt: /\b(olá|ola|bom dia|boa tarde|boa noite|sim|nao|não|não obrigado|obrigado|senhor|senhora|meu nome é|me chamo|estou ocupado|não me ligue|motorista|caminhão|caminhao|por favor)\b/i,
      hi: /(नमस्ते|हाँ|नहीं|धन्यवाद|मेरा नाम|मुझे नहीं चाहिए|ठीक है|रुको|मुझे ना बुलाएं)|(namaste|haan|nahin|theek hai|mujhe nahin chahiye|main karta)\b/i
    };
    function detectLanguage(text, fallback = "en") {
      const t = String(text || "");
      for (const [loc, re] of Object.entries(MARKERS)) {
        if (re.test(t)) return loc;
      }
      return fallback;
    }
    var NORMAL = { en: "en", es: "es", fr: "fr", de: "de", pt: "pt", hi: "hi" };
    function normalizeLocale(locale) {
      const raw = String(locale || "en").trim().toLowerCase();
      if (raw === "auto") return "auto";
      const base = raw.split("-")[0];
      return NORMAL[base] || "en";
    }
    function lex(items) {
      const body = items.map(
        (w) => String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['\u2019]/g, "['\u2019]").replace(/\s+/g, "\\s+")
      ).join("|");
      return new RegExp("(?:^|[^A-Za-z0-9])(?:" + body + ")(?:$|[^A-Za-z0-9])", "i");
    }
    var NEGATIVE_BY_LOCALE = {
      en: /\b(no thanks|not interested|no thank you|just say no|stop|don't call|never mind|not now|wrong number|not anymore)\b/i,
      es: lex(["no gracias", "no me interesa", "no quiero", "no me llame", "no me molestes", "para por favor", "d\xE9jeme en paz", "no m\xE1s", "no ahora", "n\xFAmero equivocado", "no me interesan"]),
      fr: lex(["non merci", "pas int\xE9ress\xE9", "pas int\xE9resse", "je ne veux pas", "ne me rappelez pas", "arr\xEAte", "arr\xEAtez", "arr\xEAtez de m'appeler", "plus jamais", "pas maintenant", "mauvais num\xE9ro", "\xE7a ne m'int\xE9resse pas"]),
      de: lex(["nein danke", "nicht interessiert", "ich will nicht", "rufen sie mich nicht an", "h\xF6r auf", "aufh\xF6ren", "nie wieder", "nicht jetzt", "falsche nummer", "nicht mehr"]),
      pt: lex(["n\xE3o obrigado", "n\xE3o estou interessado", "n\xE3o quero", "n\xE3o me ligue", "para por favor", "chega", "nunca mais", "n\xE3o agora", "n\xFAmero errado", "n\xE3o tenho interesse"]),
      hi: lex(["\u0928\u0939\u0940\u0902 \u091A\u093E\u0939\u093F\u090F", "\u0928\u0939\u0940\u0902 \u0927\u0928\u094D\u092F\u0935\u093E\u0926", "\u0928\u0939\u0940\u0902", "\u092E\u0941\u091D\u0947 \u0928\u0939\u0940\u0902 \u091A\u093E\u0939\u093F\u090F", "\u092C\u0902\u0926 \u0915\u0930\u094B", "\u0905\u092D\u0940 \u0928\u0939\u0940\u0902", "\u0917\u0932\u0924 \u0928\u0902\u092C\u0930", "nahin", "nahin chahiye", "no thanks", "band karo", "abhi nahin", "galat number"])
    };
    var SOFT_BY_LOCALE = {
      en: /\b(driving|on the road|rolling|busy|shutting down|about to|send me some|email me|text me|more info|already have|have my own|got a guy|leased to|market is bad|market's bad|no freight|no loads|board is dead|rates are|bad market|slow right now)\b/i,
      es: lex(["estoy conduciendo", "conduciendo", "voy manejando", "manejando", "al volante", "en la carretera", "ocupado", "ya tengo", "mi despachador", "mi jefe", "m\xE1ndame info", "m\xE1ndame informaci\xF3n", "env\xEDeme informaci\xF3n", "el mercado est\xE1 mal", "no hay carga", "no hay fletes", "las tarifas", "est\xE1n baratas", "lento"]),
      fr: lex(["je conduis", "sur la route", "occup\xE9", "occup\xE9e", "j'ai d\xE9j\xE0", "mon dispatcher", "mon courtier", "envoyez-moi", "je suis press\xE9", "le march\xE9 est mauvais", "pas de fret", "pas de chargement", "les tarifs", "au ralenti"]),
      de: lex(["unterwegs", "auf der stra\xDFe", "besch\xE4ftigt", "habe schon", "mein dispatcher", "mein broker", "schicken sie mir", "markt ist schlecht", "keine ladung", "keine fracht", "die tarife", "langsam"]),
      pt: lex(["dirigindo", "na estrada", "ocupado", "j\xE1 tenho", "meu dispatcher", "meu despachante", "me mande", "envie", "o mercado est\xE1 ruim", "sem carga", "sem fretes", "as tarifas", "est\xE3o baixas", "lento"]),
      hi: lex(["\u0921\u094D\u0930\u093E\u0907\u0935\u093F\u0902\u0917", "\u092C\u093F\u091C\u093C\u0940", "\u092A\u0939\u0932\u0947 \u0938\u0947 \u0939\u0948", "\u092E\u0947\u0930\u093E \u0921\u093F\u0938\u094D\u092A\u0948\u091A\u0930", "\u0915\u094B\u0908 \u0932\u094B\u0921 \u0928\u0939\u0940\u0902", "\u092C\u093E\u091C\u093C\u093E\u0930 \u0916\u0930\u093E\u092C", "\u092D\u0947\u091C \u0926\u094B \u091C\u093E\u0928\u0915\u093E\u0930\u0940", "driving", "busy", "already have", "mera dispatcher", "no loads", "market bad", "send karo"])
    };
    var POSITIVE_BY_LOCALE = {
      en: ["yes", "yeah", "interested", "how much", "cost", "price", "quote", "need", "looking for", "that sounds", "go ahead", "sure", "okay", "ok"],
      es: ["s\xED", "si", "me interesa", "interesado", "cu\xE1nto", "precio", "cotizaci\xF3n", "necesito", "me gustar\xEDa", "adelante", "claro", "de acuerdo", "bueno", "suena bien"],
      fr: ["oui", "int\xE9ress\xE9", "int\xE9ress\xE9e", "combien", "prix", "devis", "j'ai besoin", "je veux", "allez-y", "d'accord", "bien", "\xE7a me va", "pourquoi pas"],
      de: ["ja", "interessiert", "wie viel", "kosten", "preis", "angebot", "ich brauche", "ich will", "los", "okay", "klingt gut", "einverstanden", "gerne"],
      pt: ["sim", "interessado", "quanto", "pre\xE7o", "or\xE7amento", "preciso", "quero", "pode ser", "claro", "de acordo", "\xF3timo", "gostei"],
      hi: ["haan", "theek hai", "kitna", "kitna lagta hai", "price", "quote", "chahiye", "mujhe chahiye", "bolo", "lo", "okay", "zaaroor", "\u091A\u093E\u0939\u093F\u090F", "\u092E\u0941\u091D\u0947 \u091A\u093E\u0939\u093F\u090F", "\u0920\u0940\u0915 \u0939\u0948", "\u0939\u093E\u0901", "\u0915\u093F\u0924\u0928\u093E", "\u0915\u0940\u092E\u0924", "\u092D\u0947\u091C\u094B", "\u091C\u0930\u0942\u0930"]
    };
    var NEGATIVE_WORDS_BY_LOCALE = {
      en: ["no", "not interested", "no thanks", "stop", "don't call", "never mind", "not now"],
      es: ["no", "no me interesa", "no gracias", "no quiero", "d\xE9jeme", "no me llame", "nunca"],
      fr: ["non", "pas int\xE9ress\xE9", "non merci", "je ne veux pas", "arr\xEAtez", "ne me rappelez pas", "jamais"],
      de: ["nein", "nicht interessiert", "nein danke", "ich will nicht", "h\xF6ren sie auf", "rufen sie nicht an", "niemals"],
      pt: ["n\xE3o", "n\xE3o estou interessado", "n\xE3o obrigado", "n\xE3o quero", "chega", "n\xE3o me ligue", "nunca"],
      hi: ["nahin", "no", "nahin chahiye", "band karo", "mat karo"]
    };
    var HUMAN_BY_LOCALE = {
      en: /\b(real person|human|agent|representative|someone else|talk to a person)\b/i,
      es: lex(["persona real", "una persona", "un humano", "hablar con una persona", "habla con una persona", "un representante", "un agente", "alguien de verdad"]),
      fr: lex(["une personne r\xE9elle", "une vraie personne", "un vrai humain", "un humain", "parler \xE0 une personne", "parler \xE0 quelqu'un", "un repr\xE9sentant", "un agent"]),
      de: lex(["eine echte person", "einen menschen", "echten menschen", "mit einem agenten", "einen vertreter", "mit einer person sprechen"]),
      pt: lex(["uma pessoa real", "uma pessoa de verdade", "um humano", "um representante", "um atendente", "falar com uma pessoa", "falar com algu\xE9m"]),
      hi: lex(["\u090F\u0915 \u0907\u0902\u0938\u093E\u0928", "\u0905\u0938\u0932\u0940 \u0907\u0902\u0938\u093E\u0928", "\u090F\u0915 \u0935\u094D\u092F\u0915\u094D\u0924\u093F", "\u0915\u093F\u0938\u0940 \u0938\u0947 \u092C\u093E\u0924", "\u090F\u091C\u0947\u0902\u091F", "real person", "insaan", "agent", "kisi se baat", "ek insaan se baat"])
    };
    var POOLS_BY_LOCALE = {
      en: {
        opening: [
          { key: "hook_permission_timebox", base: 1.4, pool: [
            "This is {agent} from {company}. I know this is a cold call - you can hang up right now, or give me twenty seconds to tell you why I called. Your choice.",
            "I'll be straight with you - I know you've got somewhere to be. Can I have thirty seconds to tell you what we do, and then I'm gone either way?"
          ] },
          { key: "hook_reason_first", base: 1.6, pool: [
            "The reason I'm calling is simple: your truck makes money loaded and burns money empty. I keep owner-operators loaded back-to-back at top rates. That's the whole call.",
            "This is {agent} from {company}. The reason for this call is one thing - I stop owner-operators from sitting a day between loads. Can I explain that in thirty seconds?"
          ] },
          { key: "hook_specificity", base: 1.5, pool: [
            "I was checking what's moving out of your area on your rig type this week, and there's a lane running at above board rate. Are you running under your own authority right now?",
            "Quick one from our dispatch desk - we're filling reloads this week and I wanted to see if you're still taking freight in your area. Would that help right now?"
          ] },
          { key: "hook_how_have_you_been", base: 0.9, pool: [
            "{agent} from {company} - how have you been?"
          ] },
          { key: "hook_social_proof", base: 1.2, pool: [
            "We work with owner-operators running out of your area keep them rolling back-to-back - have you heard our name tossed around?",
            "Most of the drivers we talk to were self-dispatching until the empty miles added up - that's exactly who we built this for. Is that you right now?"
          ] }
        ],
        rapport: [
          { key: "rapport_we_language", base: 1.5, pool: [
            "That's great to hear. Before I let you go - a couple of quick seconds and we'll have a real answer for you.",
            "Love it. This will take less than a minute, and we'll have my dispatcher follow up with something concrete.",
            "Awesome. Keeping this short - we'll make it worth your time."
          ] },
          { key: "rapport_mirroring", base: 1.1, pool: [
            "No rush on my end - take your time.",
            "I hear you've got a full plate, so we'll keep this simple. One thing at a time.",
            "I know you're either rolling or about to roll, so I'll be quick with you."
          ] }
        ],
        pivot: [
          { key: "obj_not_interested", base: 1.3, pool: [
            "Fair enough - you don't even know what we do yet, so that's a fair answer. If I told you the average guy loses two hundred dollars a load skipping the counter-offer, would that be worth thirty seconds? If not, I'll let you go right now.",
            "Totally fair. Quick one before I go, just to be safe - do you ever dispatch loads to the southern states? No commitment at all."
          ] },
          { key: "obj_busy_callback_slot", base: 1.5, pool: [
            "You're driving - I'm not going to hold you up, that's how you make your money. When do you figure you'll be shut down tonight? I'll call you when you're parked - that work?",
            "I know you're on the road, so let's pin the call instead of playing tag. What time do you usually shut down? I'll call you then."
          ] },
          { key: "obj_send_info_qualify", base: 1.4, pool: [
            "Happy to send it over, and so I send the right thing - who books your loads right now, you or a dispatcher?",
            "I'll text you a one-pager, and after your next drop I'll circle back - who'd you say handles your load-finding today?"
          ] },
          { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
            "Good - that tells me you already know dispatch pays for itself, which is why I'm calling. Real quick: what do you like most about how they work?",
            "If you already run with someone, great - here's all I'm asking: let me find you one load this week, run it through me, compare numbers side by side. If mine isn't better, you keep your guy."
          ] },
          { key: "obj_rates_loss_aversion", base: 1.2, pool: [
            "You're right - the market's been flat for years now. Spot rates have sat around a buck eighty-eight a mile. And that's exactly why it's worth having somebody negotiate every load - guys booking their own take the first offer. Twenty extra dollars a load, three loads a week - that's over three grand a year walking away. Worth a real look?",
            "When rates are flat, the fight is on the tariff, not the road. We counter every load before we book it - that's where the money shows back up. Can I show you in real numbers?"
          ] }
        ],
        closeGood: [
          { key: "close_assumptive", base: 1.5, pool: [
            "Here's what happens next - I set up your profile tonight, and first thing tomorrow I'm out looking for your next load. What time are you usually up? I'll have something waiting.",
            "If this is going to work, the next step is a fifteen-minute talk while you're parked. Do you have your calendar handy?"
          ] },
          { key: "close_one_load_trial", base: 1.5, pool: [
            "The fastest way to tell if this is worth it is one load. You approve it, you run it, you look at the numbers. If it's not better than what you were doing, we shake hands and I'm done. Deal?",
            "Give me your next drop-off city, and I'll have a load waiting by the time you unload. You don't even have to think about it - we'll do the thinking."
          ] }
        ],
        closeWarm: [
          { key: "close_backup_two_weeks", base: 1.4, pool: [
            "Since you're set up already, here's the deal - let me be your backup for two weeks on the loads they can't get you. No charge. If one of my loads pays better, you'll know exactly what I'm worth.",
            "Look, you don't have to commit to anything today. All I'm asking is that you don't book your next deadhead run until I show you what's on the board. If I've got nothing better, you lose nothing."
          ] }
        ]
      },
      es: {
        opening: [
          { key: "hook_permission_timebox", base: 1.4, pool: [
            "Hola, soy {agent} de {company}. S\xE9 que es una llamada en fr\xEDo - puede colgar ahora mismo, o darme veinte segundos para contarle por qu\xE9 llamo. Usted decide.",
            "Le hablo claro - s\xE9 que tiene prisa. \xBFMe da treinta segundos para contarle qu\xE9 hacemos? Despu\xE9s me retiro, de todas maneras."
          ] },
          { key: "hook_reason_first", base: 1.6, pool: [
            "La raz\xF3n de mi llamada es simple: su cami\xF3n gana dinero cargado y pierde dinero vac\xEDo. Yo mantengo a los propietarios-operadores con fletes seguidos y a buenas tarifas. Eso es toda la llamada.",
            "Soy {agent} de {company}. Llamo por una sola cosa: evitar que los camioneros pasen d\xEDas sin carga. \xBFLe explico en treinta segundos?"
          ] },
          { key: "hook_specificity", base: 1.5, pool: [
            "Estaba revisando qu\xE9 carga est\xE1 saliendo de su zona esta semana para su tipo de unidad, y hay un corredor pagando por encima de la tarifa normal. \xBFEst\xE1 trabajando bajo su propia autoridad?",
            "Un dato r\xE1pido de nuestro escritorio de despacho - estamos llenando fletes de regreso esta semana y quer\xEDa saber si est\xE1 tomando carga en su zona. \xBFLe servir\xEDa ahora?"
          ] },
          { key: "hook_social_proof", base: 1.2, pool: [
            "Trabajamos con propietarios-operadores de su zona para mantenerlos rodando sin parar - \xBFha escuchado nuestro nombre por ah\xED?",
            "La mayor\xEDa de los conductores con los que hablamos se despachaban solos hasta que los kil\xF3metros vac\xEDos se acumularon - para eso exactamente lo construimos. \xBFEse es su caso?"
          ] }
        ],
        rapport: [
          { key: "rapport_we_language", base: 1.5, pool: [
            "Qu\xE9 bueno escucharlo. Antes de dejarlo ir - un par de segundos y le damos una respuesta real.",
            "Me alegra. Esto tomar\xE1 menos de un minuto, y mi despachador le seguir\xE1 con algo concreto."
          ] },
          { key: "rapport_mirroring", base: 1.1, pool: [
            "No hay prisa de mi parte - t\xF3mese su tiempo.",
            "S\xE9 que est\xE1 ocupado, as\xED que lo mantendremos simple. Una cosa a la vez."
          ] }
        ],
        pivot: [
          { key: "obj_not_interested", base: 1.3, pool: [
            "Entiendo - todav\xEDa ni sabe lo que hacemos, as\xED que es justo. Si le dijera que el promedio pierde doscientos d\xF3lares por flete al saltarse la contraoferta, \xBFvaldr\xEDa treinta segundos? Si no, lo dejo ir ahora mismo.",
            "Totalmente justo. Una pregunta r\xE1pida antes de irme, para estar seguro - \xBFalguna vez despacha fletes hacia el sur? Sin ning\xFAn compromiso."
          ] },
          { key: "obj_busy_callback_slot", base: 1.5, pool: [
            "Va manejando - no lo voy a detener, as\xED es como hace su dinero. \xBFA qu\xE9 hora piensa que se detiene esta noche? Lo llamo cuando est\xE9 estacionado, \xBFle funciona?",
            "S\xE9 que va en la carretera, mejor fijamos la llamada. \xBFA qu\xE9 hora suele detenerse? Lo llamo en ese momento."
          ] },
          { key: "obj_send_info_qualify", base: 1.4, pool: [
            "Con gusto se la env\xEDo, y para mandarle lo correcto - \xBFqui\xE9n le reserva sus fletes ahora, usted o un despachador?",
            "Le mando un resumen por texto, y despu\xE9s de su pr\xF3xima entrega vuelvo a llamar - \xBFqui\xE9n maneja hoy su b\xFAsqueda de carga?"
          ] },
          { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
            "Bien - eso me dice que ya sabe que el despacho se paga solo. R\xE1pido: \xBFqu\xE9 es lo que m\xE1s le gusta de c\xF3mo trabajan?",
            "Si ya trabaja con alguien, perfecto - solo le pido esto: d\xE9jeme encontrarle UN flete esta semana, c\xF3rralo conmigo y comparemos n\xFAmeros lado a lado."
          ] },
          { key: "obj_rates_loss_aversion", base: 1.2, pool: [
            "Tiene raz\xF3n - el mercado lleva a\xF1os plano. Por eso vale la pena que alguien negocie cada flete por usted. Veinte d\xF3lares m\xE1s por flete, tres fletes a la semana - m\xE1s de tres mil d\xF3lares al a\xF1o regalados. \xBFVale la pena verlo?",
            "Cuando las tarifas est\xE1n planas, la pelea est\xE1 en la tarifa, no en la carretera. Nosotros contraofertamos cada flete antes de reservarlo. \xBFSe lo muestro con n\xFAmeros reales?"
          ] }
        ],
        closeGood: [
          { key: "close_assumptive", base: 1.5, pool: [
            "Esto es lo que sigue - le preparo su perfil esta noche y ma\xF1ana temprano salgo a buscar su siguiente flete. \xBFTiene su calendario a la mano?",
            "Si esto va a funcionar, el siguiente paso es una conversaci\xF3n de quince minutos cuando est\xE9 estacionado. \xBFA qu\xE9 hora suele levantarse?"
          ] }
        ],
        closeWarm: [
          { key: "close_backup_two_weeks", base: 1.4, pool: [
            "Como ya est\xE1 trabajando con alguien, aqu\xED est\xE1 el trato - d\xE9jeme ser su respaldo por dos semanas en los fletes que no le consiguen. Sin costo.",
            "Hoy no tiene que comprometerse a nada. Solo le pido que no reserve su siguiente viaje en vac\xEDo hasta que le muestre lo que hay en la pizarra."
          ] }
        ]
      },
      fr: {
        opening: [
          { key: "hook_permission_timebox", base: 1.4, pool: [
            "Bonjour, je suis {agent} de {company}. Je sais que c'est un appel \xE0 froid - vous pouvez raccrocher tout de suite, ou me donner vingt secondes pour vous dire pourquoi j'appelle. \xC0 vous de choisir.",
            "Je vais \xEAtre franc - je sais que vous avez autre chose \xE0 faire. Est-ce que je peux avoir trente secondes pour vous expliquer ce qu'on fait ? Ensuite je raccroche, promis."
          ] },
          { key: "hook_reason_first", base: 1.6, pool: [
            "La raison de mon appel est simple : votre camion gagne de l'argent charg\xE9 et perd de l'argent vide. Je garde les propri\xE9taires-exploitants charg\xE9s sans arr\xEAt, \xE0 de bons tarifs. C'est tout l'appel.",
            "Je suis {agent} de {company}. J'appelle pour une seule chose : emp\xEAcher les camionneurs de rester des jours sans chargement. Je peux vous expliquer en trente secondes ?"
          ] },
          { key: "hook_specificity", base: 1.5, pool: [
            "Je regardais ce qui bouge dans votre r\xE9gion cette semaine pour votre type de camion, et il y a une ligne qui paie au-dessus du tarif du march\xE9. Vous roulez sous votre propre autorit\xE9 en ce moment ?",
            "Une info rapide de notre bureau de dispatch - on remplit des retours cette semaine et je voulais savoir si vous prenez toujours du fret dans votre r\xE9gion. \xC7a vous aiderait maintenant ?"
          ] },
          { key: "hook_social_proof", base: 1.2, pool: [
            "On travaille avec des propri\xE9taires-exploitants de votre r\xE9gion pour les garder charg\xE9s sans arr\xEAt - vous avez d\xE9j\xE0 entendu notre nom ?",
            "La plupart des chauffeurs \xE0 qui on parle se dispatcheaient eux-m\xEAmes jusqu'\xE0 ce que les kilom\xE8tres \xE0 vide s'accumulent - c'est exactement pour \xE7a qu'on a construit \xE7a. C'est votre cas ?"
          ] }
        ],
        rapport: [
          { key: "rapport_we_language", base: 1.5, pool: [
            "C'est bon \xE0 entendre. Avant de vous laisser aller - deux petites secondes et on aura une vraie r\xE9ponse pour vous.",
            "Parfait. \xC7a prendra moins d'une minute, et mon dispatcher vous rappellera avec quelque chose de concret."
          ] },
          { key: "rapport_mirroring", base: 1.1, pool: [
            "Pas de pression de mon c\xF4t\xE9 - prenez votre temps.",
            "Je sais que vous \xEAtes occup\xE9, alors on reste simple. Une chose \xE0 la fois."
          ] }
        ],
        pivot: [
          { key: "obj_not_interested", base: 1.3, pool: [
            "Compr\xE9hensible - vous ne savez m\xEAme pas encore ce qu'on fait, c'est juste. Si je vous disais qu'en moyenne on perd deux cents dollars par chargement en sautant la contre-offre, \xE7a vaudrait trente secondes ? Si non, je vous laisse tout de suite.",
            "Tout \xE0 fait juste. Une petite question avant de partir, pour \xEAtre s\xFBr - vous dispatcheez parfois des chargements vers le sud ? Sans aucun engagement."
          ] },
          { key: "obj_busy_callback_slot", base: 1.5, pool: [
            "Vous conduisez - je ne vais pas vous retenir, c'est comme \xE7a que vous gagnez votre argent. Vous pensez vous arr\xEAter quand ce soir ? Je vous rappelle quand vous \xEAtes gar\xE9 - \xE7a marche ?",
            "Je sais que vous \xEAtes sur la route, alors fixons l'appel plut\xF4t que de jouer au chat et \xE0 la souris. Vous vous arr\xEAtez habituellement \xE0 quelle heure ?"
          ] },
          { key: "obj_send_info_qualify", base: 1.4, pool: [
            "Avec plaisir, et pour vous envoyer la bonne chose - qui r\xE9serve vos chargements en ce moment, vous ou un dispatcher ?",
            "Je vous envoie un r\xE9sum\xE9, et apr\xE8s votre prochaine livraison je reviens vers vous - qui s'occupe de trouver vos chargements aujourd'hui ?"
          ] },
          { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
            "Bien - \xE7a me dit que vous savez d\xE9j\xE0 que le dispatch se rentabilise. Vite : qu'est-ce que vous aimez le plus dans leur fa\xE7on de travailler ?",
            "Si vous travaillez d\xE9j\xE0 avec quelqu'un, parfait - je vous demande seulement ceci : laissez-moi vous trouver UN chargement cette semaine, testez, comparons les chiffres c\xF4te \xE0 c\xF4te."
          ] },
          { key: "obj_rates_loss_aversion", base: 1.2, pool: [
            "Vous avez raison - le march\xE9 est plat depuis des ann\xE9es. C'est exactement pour \xE7a qu'il vaut le coup que quelqu'un n\xE9gocie chaque chargement. Vingt dollars de plus par chargement, trois par semaine - plus de trois mille dollars par an perdus. \xC7a vaut un vrai regard ?",
            "Quand les tarifs sont plats, le combat se joue sur le fret, pas sur la route. On n\xE9gocie chaque chargement avant de le r\xE9server. Je vous montre avec de vrais chiffres ?"
          ] }
        ],
        closeGood: [
          { key: "close_assumptive", base: 1.5, pool: [
            "Voil\xE0 ce qui se passe ensuite - je pr\xE9pare votre profil ce soir, et demain matin je cherche votre prochain chargement. Vous avez votre calendrier sous la main ?",
            "Si \xE7a doit fonctionner, la prochaine \xE9tape est une conversation de quinze minutes quand vous \xEAtes gar\xE9. Vous vous levez \xE0 quelle heure ?"
          ] }
        ],
        closeWarm: [
          { key: "close_backup_two_weeks", base: 1.4, pool: [
            "Comme vous \xEAtes d\xE9j\xE0 \xE9quip\xE9, voici le deal - laissez-moi \xEAtre votre secours pendant deux semaines sur les chargements qu'ils ne trouvent pas. Sans frais.",
            "Vous n'avez rien \xE0 d\xE9cider aujourd'hui. Je vous demande juste de ne pas r\xE9server votre prochain trajet \xE0 vide avant que je vous montre ce qu'il y a sur le tableau."
          ] }
        ]
      },
      de: {
        opening: [
          { key: "hook_permission_timebox", base: 1.4, pool: [
            "Hallo, hier ist {agent} von {company}. Ich wei\xDF, dass das ein Kaltanruf ist - Sie k\xF6nnen jetzt auflegen oder mir zwanzig Sekunden geben, um zu erkl\xE4ren, warum ich anrufe. Ihre Entscheidung.",
            "Ich bin direkt - ich wei\xDF, dass Sie zu tun haben. Geben Sie mir drei\xDFig Sekunden, um zu erkl\xE4ren, was wir machen? Danach bin ich weg, egal was passiert."
          ] },
          { key: "hook_reason_first", base: 1.6, pool: [
            "Der Grund meines Anrufs ist einfach: Ihr Lkw verdient Geld, wenn er beladen ist, und verliert Geld, wenn er leer f\xE4hrt. Ich halte Inhaber-Fahrer bei guten Tarifen durchgehend mit Ladung versorgt. Das ist der ganze Anruf.",
            "Hier ist {agent} von {company}. Ich rufe aus einem einzigen Grund an - ich verhindere, dass Inhaber-Fahrer tagelang ohne Ladung sitzen. Darf ich das in drei\xDFig Sekunden erkl\xE4ren?"
          ] },
          { key: "hook_specificity", base: 1.5, pool: [
            "Ich habe gerade gepr\xFCft, was diese Woche aus Ihrer Region f\xFCr Ihren Fahrzeugtyp l\xE4uft, und da ist eine Route, die \xFCber dem Standard-Tarif bezahlt. Sind Sie gerade unter eigener Genehmigung unterwegs?",
            "Eine kurze Frage von unserer Disposition - wir f\xFCllen diese Woche R\xFCckladungen und ich wollte wissen, ob Sie in Ihrer Region noch Fracht annehmen. W\xFCrde das jetzt helfen?"
          ] },
          { key: "hook_social_proof", base: 1.2, pool: [
            "Wir arbeiten mit Inhaber-Fahrern aus Ihrer Region und halten sie durchgehend geladen - haben Sie unseren Namen schon mal geh\xF6rt?",
            "Die meisten Fahrer, mit denen wir sprechen, haben sich selbst disponiert, bis sich die Leerkilometer anh\xE4uften - genau daf\xFCr haben wir das gebaut. Sind Sie das gerade?"
          ] }
        ],
        rapport: [
          { key: "rapport_we_language", base: 1.5, pool: [
            "Sch\xF6n zu h\xF6ren. Bevor ich Sie lasse - ein paar schnelle Sekunden und wir haben eine echte Antwort f\xFCr Sie.",
            "Super. Das dauert weniger als eine Minute, und mein Disponent meldet sich mit etwas Konkretem bei Ihnen."
          ] },
          { key: "rapport_mirroring", base: 1.1, pool: [
            "Keine Eile bei mir - nehmen Sie sich Zeit.",
            "Ich wei\xDF, dass Sie viel zu tun haben, also bleiben wir einfach. Eins nach dem anderen."
          ] }
        ],
        pivot: [
          { key: "obj_not_interested", base: 1.3, pool: [
            "Verstanden - Sie wissen ja noch gar nicht, was wir machen, das ist fair. Wenn ich Ihnen sage, dass der Durchschnitt zweihundert Dollar pro Ladung verliert, wenn er das Gegenangebot \xFCberspringt - w\xE4ren das drei\xDFig Sekunden wert? Wenn nicht, lasse ich Sie sofort gehen.",
            "Absolut fair. Eine schnelle Frage, bevor ich gehe - disponieren Sie manchmal Ladungen in den S\xFCden? Ganz ohne Verpflichtung."
          ] },
          { key: "obj_busy_callback_slot", base: 1.5, pool: [
            "Sie fahren - ich halte Sie nicht auf, so verdienen Sie Ihr Geld. Wann sind Sie heute Abend ungef\xE4hr fertig? Ich rufe an, wenn Sie geparkt haben - passt das?",
            "Ich wei\xDF, dass Sie unterwegs sind, also legen wir den Anruf fest, statt uns zu jagen. Wann machen Sie normalerweise Feierabend?"
          ] },
          { key: "obj_send_info_qualify", base: 1.4, pool: [
            "Gerne schicke ich es Ihnen - und damit ich das Richtige schicke: Wer bucht Ihre Ladungen gerade, Sie oder ein Disponent?",
            "Ich schicke Ihnen eine Zusammenfassung, und nach Ihrer n\xE4chsten Entladung melde ich mich wieder - wer sucht heute Ihre Ladungen?"
          ] },
          { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
            "Gut - das sagt mir, dass Sie schon wissen, dass sich Disposition bezahlt macht. Kurz: Was sch\xE4tzen Sie an der Arbeit am meisten?",
            "Wenn Sie schon mit jemandem arbeiten, super - ich bitte nur um eines: Lassen Sie mich diese Woche EINE Ladung f\xFCr Sie finden, testen Sie, vergleichen wir die Zahlen."
          ] },
          { key: "obj_rates_loss_aversion", base: 1.2, pool: [
            "Sie haben recht - der Markt ist seit Jahren flach. Genau deshalb lohnt es sich, dass jemand jede Ladung f\xFCr Sie verhandelt. Zwanzig Dollar mehr pro Ladung, drei pro Woche - \xFCber dreitausend Dollar pro Jahr, die verschenkt werden. Ist das einen echten Blick wert?",
            "Wenn die Tarife flach sind, wird der Kampf um den Tarif gef\xFChrt, nicht um die Stra\xDFe. Wir verhandeln jede Ladung, bevor wir sie buchen. Darf ich es Ihnen mit echten Zahlen zeigen?"
          ] }
        ],
        closeGood: [
          { key: "close_assumptive", base: 1.5, pool: [
            "Hier ist, was als N\xE4chstes passiert - ich richte heute Abend Ihr Profil ein und morgen fr\xFCh suche ich Ihre n\xE4chste Ladung. Haben Sie Ihren Kalender zur Hand?",
            "Wenn das funktionieren soll, ist der n\xE4chste Schritt ein Gespr\xE4ch von f\xFCnfzehn Minuten, wenn Sie geparkt haben. Um welche Zeit stehen Sie normalerweise auf?"
          ] }
        ],
        closeWarm: [
          { key: "close_backup_two_weeks", base: 1.4, pool: [
            "Da Sie schon eingerichtet sind, hier das Angebot - lassen Sie mich zwei Wochen lang Ihr Backup f\xFCr die Ladungen sein, die sie nicht finden. Kostenlos.",
            "Sie m\xFCssen heute nichts entscheiden. Ich bitte nur darum, dass Sie Ihre n\xE4chste Leerfahrt nicht buchen, bevor ich Ihnen zeige, was auf dem Board ist."
          ] }
        ]
      },
      pt: {
        opening: [
          { key: "hook_permission_timebox", base: 1.4, pool: [
            "Ol\xE1, aqui \xE9 {agent} da {company}. Eu sei que \xE9 uma liga\xE7\xE3o a frio - voc\xEA pode desligar agora, ou me dar vinte segundos para contar o porqu\xEA da minha liga\xE7\xE3o. Voc\xEA escolhe.",
            "Vou ser direto - sei que voc\xEA est\xE1 ocupado. Me d\xE1 trinta segundos para explicar o que fazemos? Depois eu encerro, de qualquer forma."
          ] },
          { key: "hook_reason_first", base: 1.6, pool: [
            "O motivo da minha liga\xE7\xE3o \xE9 simples: seu caminh\xE3o ganha dinheiro carregado e perde dinheiro vazio. Eu mantenho os propriet\xE1rios-operadores carregados sem parar, com boas tarifas. Isso \xE9 toda a liga\xE7\xE3o.",
            "Aqui \xE9 {agent} da {company}. Ligo por uma \xFAnica coisa - impedir que caminhoneiros fiquem dias sem carga. Posso explicar em trinta segundos?"
          ] },
          { key: "hook_specificity", base: 1.5, pool: [
            "Eu estava verificando o que est\xE1 saindo da sua regi\xE3o esta semana para o seu tipo de caminh\xE3o, e tem uma rota pagando acima da tarifa normal. Voc\xEA est\xE1 rodando por conta pr\xF3pria agora?",
            "Um aviso r\xE1pido do nosso escrit\xF3rio - estamos preenchendo fretes de volta esta semana e queria saber se voc\xEA ainda est\xE1 aceitando carga na sua regi\xE3o. Ajudaria agora?"
          ] },
          { key: "hook_social_proof", base: 1.2, pool: [
            "Trabalhamos com propriet\xE1rios-operadores da sua regi\xE3o para mant\xEA-los rodando sem parar - voc\xEA j\xE1 ouviu falar do nosso nome?",
            "A maioria dos motoristas com quem falamos se despachava sozinho at\xE9 os quil\xF4metros vazios se acumularem - foi exatamente para isso que constru\xEDmos. \xC9 o seu caso?"
          ] }
        ],
        rapport: [
          { key: "rapport_we_language", base: 1.5, pool: [
            "Que bom ouvir isso. Antes de deixar voc\xEA ir - alguns segundos e teremos uma resposta real para voc\xEA.",
            "\xD3timo. Vai levar menos de um minuto, e meu despachante vai entrar em contato com algo concreto."
          ] },
          { key: "rapport_mirroring", base: 1.1, pool: [
            "Sem pressa da minha parte - fique \xE0 vontade.",
            "Sei que voc\xEA est\xE1 ocupado, ent\xE3o vamos manter simples. Uma coisa por vez."
          ] }
        ],
        pivot: [
          { key: "obj_not_interested", base: 1.3, pool: [
            "Entendo - voc\xEA ainda nem sabe o que fazemos, ent\xE3o \xE9 justo. Se eu dissesse que em m\xE9dia se perdem duzentos d\xF3lares por frete ao pular a contraproposta, valeria trinta segundos? Se n\xE3o, eu j\xE1 encerro agora.",
            "Totalmente justo. Uma pergunta r\xE1pida antes de ir, s\xF3 para garantir - voc\xEA despacha fretes para o sul? Sem compromisso nenhum."
          ] },
          { key: "obj_busy_callback_slot", base: 1.5, pool: [
            "Voc\xEA est\xE1 dirigindo - n\xE3o vou te segurar, \xE9 assim que voc\xEA ganha seu dinheiro. A que horas acha que vai parar hoje \xE0 noite? Eu te ligo quando estiver estacionado - serve?",
            "Sei que est\xE1 na estrada, ent\xE3o vamos fixar a liga\xE7\xE3o em vez de ficar de telefone contando. A que horas voc\xEA costuma parar?"
          ] },
          { key: "obj_send_info_qualify", base: 1.4, pool: [
            "Com prazer te envio, e para mandar a coisa certa - quem reserva seus fretes agora, voc\xEA ou um despachante?",
            "Te mando um resumo, e depois da sua pr\xF3xima entrega eu volto a contatar - quem cuida da sua busca de carga hoje?"
          ] },
          { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
            "\xD3timo - isso me diz que voc\xEA j\xE1 sabe que despacho se paga. R\xE1pido: o que voc\xEA mais gosta em como eles trabalham?",
            "Se voc\xEA j\xE1 trabalha com algu\xE9m, perfeito - s\xF3 pe\xE7o isto: deixa eu encontrar UM frete esta semana, rode comigo, compare os n\xFAmeros lado a lado."
          ] },
          { key: "obj_rates_loss_aversion", base: 1.2, pool: [
            "Voc\xEA tem raz\xE3o - o mercado est\xE1 parado h\xE1 anos. \xC9 exatamente por isso que vale a pena ter algu\xE9m negociando cada frete. Vinte d\xF3lares a mais por frete, tr\xEAs por semana - mais de tr\xEAs mil por ano jogados fora. Vale dar uma olhada?",
            "Quando as tarifas est\xE3o paradas, a briga \xE9 no frete, n\xE3o na estrada. N\xF3s contraofertamos cada frete antes de reservar. Posso mostrar com n\xFAmeros reais?"
          ] }
        ],
        closeGood: [
          { key: "close_assumptive", base: 1.5, pool: [
            "Isso \xE9 o que acontece agora - eu preparo seu perfil hoje \xE0 noite e amanh\xE3 cedo saio procurando seu pr\xF3ximo frete. Voc\xEA tem seu calend\xE1rio \xE0 m\xE3o?",
            "Se isso vai funcionar, o pr\xF3ximo passo \xE9 uma conversa de quinze minutos quando voc\xEA estiver estacionado. A que horas voc\xEA costuma acordar?"
          ] }
        ],
        closeWarm: [
          { key: "close_backup_two_weeks", base: 1.4, pool: [
            "Como voc\xEA j\xE1 est\xE1 com algu\xE9m, aqui est\xE1 a proposta - deixa eu ser seu plano B por duas semanas nos fretes que eles n\xE3o conseguem. Sem custo.",
            "Voc\xEA n\xE3o precisa decidir nada hoje. S\xF3 pe\xE7o que n\xE3o reserve seu pr\xF3ximo trajeto vazio antes de eu te mostrar o que est\xE1 no quadro."
          ] }
        ]
      },
      hi: {
        opening: [
          { key: "hook_permission_timebox", base: 1.4, pool: [
            "\u0928\u092E\u0938\u094D\u0924\u0947, \u092E\u0948\u0902 {agent} \u0939\u0942\u0901, {company} \u0938\u0947\u0964 \u092E\u0941\u091D\u0947 \u092A\u0924\u093E \u0939\u0948 \u092F\u0939 \u0920\u0902\u0921\u0940 \u0915\u0949\u0932 \u0939\u0948 - \u0906\u092A \u0905\u092D\u0940 \u092B\u093C\u094B\u0928 \u0930\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902, \u092F\u093E \u092E\u0941\u091D\u0947 \u092C\u0940\u0938 \u0938\u0947\u0915\u0902\u0921 \u0926\u0947 \u0926\u0940\u091C\u093F\u090F \u0915\u093F \u092E\u0948\u0902 \u092C\u0924\u093E\u090A\u0901 \u0915\u093F \u092E\u0948\u0902\u0928\u0947 \u0915\u094D\u092F\u094B\u0902 \u0915\u0949\u0932 \u0915\u093F\u092F\u093E\u0964 \u0906\u092A\u0915\u0940 \u092E\u0930\u094D\u091C\u093C\u0940\u0964",
            "\u092E\u0948\u0902 \u0938\u0940\u0927\u0940 \u092C\u093E\u0924 \u0915\u0930\u0924\u0940 \u0939\u0942\u0901 - \u092E\u0941\u091D\u0947 \u092A\u0924\u093E \u0939\u0948 \u0906\u092A \u0935\u094D\u092F\u0938\u094D\u0924 \u0939\u0948\u0902\u0964 \u0915\u094D\u092F\u093E \u0906\u092A \u092E\u0941\u091D\u0947 \u0924\u0940\u0938 \u0938\u0947\u0915\u0902\u0921 \u0926\u0947\u0902\u0917\u0947 \u0915\u093F \u092E\u0948\u0902 \u092C\u0924\u093E \u0926\u0942\u0901 \u0939\u092E \u0915\u094D\u092F\u093E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902? \u092B\u093F\u0930 \u092E\u0948\u0902 \u091A\u0932\u0940 \u091C\u093E\u0924\u0940 \u0939\u0942\u0901, \u091A\u093E\u0939\u0947 \u0915\u0941\u091B \u092D\u0940 \u0939\u094B\u0964"
          ] },
          { key: "hook_reason_first", base: 1.6, pool: [
            "\u092E\u0947\u0930\u0940 \u0915\u0949\u0932 \u0915\u0940 \u0935\u091C\u0939 \u0938\u0940\u0927\u0940 \u0939\u0948: \u0906\u092A\u0915\u093E \u091F\u094D\u0930\u0915 \u0932\u0926\u093E \u0939\u094B \u0924\u094B \u092A\u0948\u0938\u093E \u0915\u092E\u093E\u0924\u093E \u0939\u0948 \u0914\u0930 \u0916\u093E\u0932\u0940 \u0939\u094B \u0924\u094B \u092A\u0948\u0938\u093E \u0916\u0930\u094D\u091A\u0964 \u092E\u0948\u0902 \u092E\u093E\u0932\u093F\u0915-\u0921\u094D\u0930\u093E\u0907\u0935\u0930\u094B\u0902 \u0915\u094B \u0932\u0917\u093E\u0924\u093E\u0930 \u0905\u091A\u094D\u091B\u0940 \u0926\u0930\u094B\u0902 \u092A\u0930 \u0932\u0926\u093E \u0930\u0916\u0924\u0940 \u0939\u0942\u0901\u0964 \u092C\u0938 \u092F\u0939\u0940 \u092A\u0942\u0930\u0940 \u0915\u0949\u0932 \u0939\u0948\u0964",
            "\u092E\u0948\u0902 {agent} \u0939\u0942\u0901, {company} \u0938\u0947\u0964 \u090F\u0915 \u0939\u0940 \u0935\u091C\u0939 \u0938\u0947 \u0915\u0949\u0932 \u0915\u0930 \u0930\u0939\u0940 \u0939\u0942\u0901 - \u091F\u094D\u0930\u0915 \u091A\u093E\u0932\u0915\u094B\u0902 \u0915\u094B \u092C\u093F\u0928\u093E \u092E\u093E\u0932 \u0926\u093F\u0928 \u0928\u093E \u092C\u0940\u0924\u0928\u0947 \u0926\u0942\u0901\u0964 \u0915\u094D\u092F\u093E \u092E\u0948\u0902 \u0924\u0940\u0938 \u0938\u0947\u0915\u0902\u0921 \u092E\u0947\u0902 \u0938\u092E\u091D\u093E \u0926\u0942\u0901?"
          ] },
          { key: "hook_specificity", base: 1.5, pool: [
            "\u092E\u0948\u0902 \u0926\u0947\u0916 \u0930\u0939\u0940 \u0925\u0940 \u0915\u093F \u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u0906\u092A\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0906\u092A\u0915\u0947 \u091F\u094D\u0930\u0915 \u0915\u0947 \u0932\u093F\u090F \u0915\u094D\u092F\u093E \u092E\u093E\u0932 \u0928\u093F\u0915\u0932 \u0930\u0939\u093E \u0939\u0948, \u0914\u0930 \u090F\u0915 \u0930\u0942\u091F \u092E\u093E\u0928\u0915 \u0926\u0930 \u0938\u0947 \u090A\u092A\u0930 \u092A\u0948\u0938\u093E \u0926\u0947 \u0930\u0939\u093E \u0939\u0948\u0964 \u0915\u094D\u092F\u093E \u0906\u092A \u0905\u092D\u0940 \u0905\u092A\u0928\u0947 \u0905\u0927\u093F\u0915\u093E\u0930 \u092E\u0947\u0902 \u091A\u0932\u093E \u0930\u0939\u0947 \u0939\u0948\u0902?",
            "\u0939\u092E\u093E\u0930\u0947 \u0921\u093F\u0938\u094D\u092A\u0948\u091A \u0921\u0947\u0938\u094D\u0915 \u0938\u0947 \u090F\u0915 \u092C\u093E\u0924 - \u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u0939\u092E \u0935\u093E\u092A\u0938\u0940 \u092E\u093E\u0932 \u092D\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902 \u0914\u0930 \u091C\u093E\u0928\u0928\u093E \u091A\u093E\u0939\u0924\u0947 \u0925\u0947 \u0915\u093F \u0915\u094D\u092F\u093E \u0906\u092A \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u092E\u0947\u0902 \u092E\u093E\u0932 \u0932\u0947 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964 \u0905\u092D\u0940 \u092E\u0926\u0926\u0917\u093E\u0930 \u0939\u094B\u0917\u093E?"
          ] },
          { key: "hook_social_proof", base: 1.2, pool: [
            "\u0939\u092E \u0906\u092A\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 \u0915\u0947 \u092E\u093E\u0932\u093F\u0915-\u0921\u094D\u0930\u093E\u0907\u0935\u0930\u094B\u0902 \u0915\u094B \u0932\u0917\u093E\u0924\u093E\u0930 \u0932\u0926\u093E \u0930\u0916\u0924\u0947 \u0939\u0948\u0902 - \u0915\u094D\u092F\u093E \u0906\u092A\u0928\u0947 \u0939\u092E\u093E\u0930\u093E \u0928\u093E\u092E \u0938\u0941\u0928\u093E \u0939\u0948?",
            "\u0939\u092E \u091C\u093F\u0928 \u0921\u094D\u0930\u093E\u0907\u0935\u0930\u094B\u0902 \u0938\u0947 \u092C\u093E\u0924 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0935\u0947 \u0916\u0941\u0926 \u0921\u093F\u0938\u094D\u092A\u0948\u091A \u0915\u0930\u0924\u0947 \u0925\u0947 \u091C\u092C \u0924\u0915 \u0916\u093E\u0932\u0940 \u0915\u093F\u0932\u094B\u092E\u0940\u091F\u0930 \u092C\u0922\u093C \u0928\u0939\u0940\u0902 \u0917\u090F - \u0920\u0940\u0915 \u0907\u0938\u0940 \u0915\u0947 \u0932\u093F\u090F \u0939\u092E\u0928\u0947 \u092F\u0939 \u092C\u0928\u093E\u092F\u093E \u0939\u0948\u0964 \u0915\u094D\u092F\u093E \u092F\u0939 \u0906\u092A\u0915\u0940 \u092C\u093E\u0924 \u0939\u0948?"
          ] }
        ],
        rapport: [
          { key: "rapport_we_language", base: 1.5, pool: [
            "\u092F\u0939 \u0938\u0941\u0928\u0915\u0930 \u0905\u091A\u094D\u091B\u093E \u0932\u0917\u093E\u0964 \u091C\u093E\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 - \u092C\u0938 \u0915\u0941\u091B \u0938\u0947\u0915\u0902\u0921 \u0914\u0930 \u0939\u092E\u093E\u0930\u0947 \u092A\u093E\u0938 \u0906\u092A\u0915\u0947 \u0932\u093F\u090F \u0938\u0939\u0940 \u091C\u0935\u093E\u092C \u0939\u094B\u0917\u093E\u0964",
            "\u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E\u0964 \u0907\u0938\u092E\u0947\u0902 \u090F\u0915 \u092E\u093F\u0928\u091F \u0938\u0947 \u0915\u092E \u0932\u0917\u0947\u0917\u093E, \u0914\u0930 \u092E\u0947\u0930\u093E \u0921\u093F\u0938\u094D\u092A\u0948\u091A\u0930 \u0915\u0941\u091B \u0920\u094B\u0938 \u0932\u0947\u0915\u0930 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0917\u093E\u0964"
          ] },
          { key: "rapport_mirroring", base: 1.1, pool: [
            "\u092E\u0947\u0930\u0940 \u0924\u0930\u092B \u0938\u0947 \u0915\u094B\u0908 \u091C\u0932\u094D\u0926\u0940 \u0928\u0939\u0940\u0902 - \u0906\u092A \u0905\u092A\u0928\u093E \u0938\u092E\u092F \u0932\u0940\u091C\u093F\u090F\u0964",
            "\u092E\u0948\u0902 \u091C\u093E\u0928\u0924\u0940 \u0939\u0942\u0901 \u0906\u092A \u0935\u094D\u092F\u0938\u094D\u0924 \u0939\u0948\u0902, \u0907\u0938\u0932\u093F\u090F \u092C\u093E\u0924 \u0938\u0940\u0927\u0940 \u0930\u0916\u0947\u0902\u0917\u0947\u0964 \u090F\u0915-\u090F\u0915 \u0915\u0930\u0915\u0947\u0964"
          ] }
        ],
        pivot: [
          { key: "obj_not_interested", base: 1.3, pool: [
            "\u0920\u0940\u0915 \u0939\u0948 - \u0906\u092A\u0915\u094B \u0905\u092D\u0940 \u092A\u0924\u093E \u0939\u0940 \u0928\u0939\u0940\u0902 \u0939\u092E \u0915\u094D\u092F\u093E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902, \u0924\u094B \u092F\u0939 \u0938\u0939\u0940 \u091C\u0935\u093E\u092C \u0939\u0948\u0964 \u0905\u0917\u0930 \u092E\u0948\u0902 \u0915\u0939\u0942\u0901 \u0915\u093F \u0914\u0938\u0924 \u091A\u093E\u0932\u0915 \u0939\u0930 \u092E\u093E\u0932 \u092A\u0930 \u0926\u094B \u0938\u094C \u0921\u0949\u0932\u0930 \u0917\u0901\u0935\u093E\u0924\u093E \u0939\u0948 \u0915\u093E\u0909\u0902\u091F\u0930-\u0911\u092B\u0930 \u091B\u094B\u0921\u093C\u0928\u0947 \u0938\u0947, \u0924\u094B \u0915\u094D\u092F\u093E \u0924\u0940\u0938 \u0938\u0947\u0915\u0902\u0921 \u0926\u0947\u0902\u0917\u0947? \u0928\u0939\u0940\u0902 \u0924\u094B \u092E\u0948\u0902 \u0905\u092D\u0940 \u091C\u093E\u0924\u0940 \u0939\u0942\u0901\u0964",
            "\u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0938\u0939\u0940\u0964 \u091C\u093E\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u090F\u0915 \u0924\u094D\u0935\u0930\u093F\u0924 \u092C\u093E\u0924 - \u0915\u094D\u092F\u093E \u0906\u092A \u0915\u092D\u0940 \u0926\u0915\u094D\u0937\u093F\u0923 \u0930\u093E\u091C\u094D\u092F\u094B\u0902 \u092E\u0947\u0902 \u092E\u093E\u0932 \u092D\u0947\u091C\u0924\u0947 \u0939\u0948\u0902? \u0915\u094B\u0908 \u092C\u0902\u0927\u0928 \u0928\u0939\u0940\u0902\u0964"
          ] },
          { key: "obj_busy_callback_slot", base: 1.5, pool: [
            "\u0906\u092A \u0917\u093E\u0921\u093C\u0940 \u091A\u0932\u093E \u0930\u0939\u0947 \u0939\u0948\u0902 - \u092E\u0948\u0902 \u0906\u092A\u0915\u094B \u0930\u094B\u0915\u0942\u0901\u0917\u0940 \u0928\u0939\u0940\u0902, \u0907\u0938\u0940 \u0938\u0947 \u0906\u092A \u0915\u092E\u093E\u0924\u0947 \u0939\u0948\u0902\u0964 \u0906\u091C \u0930\u093E\u0924 \u0906\u092A \u0915\u092C \u0924\u0915 \u0930\u0941\u0915\u0947\u0902\u0917\u0947? \u091C\u092C \u0906\u092A \u092A\u093E\u0930\u094D\u0915 \u0939\u094B\u0902 \u0924\u092C \u0915\u0949\u0932 \u0915\u0930\u0942\u0901 - \u091A\u0932\u0947\u0917\u093E?",
            "\u092E\u0948\u0902 \u091C\u093E\u0928\u0924\u0940 \u0939\u0942\u0901 \u0906\u092A \u0930\u093E\u0938\u094D\u0924\u0947 \u092E\u0947\u0902 \u0939\u0948\u0902, \u0924\u094B \u0915\u0949\u0932 \u0924\u092F \u0915\u0930 \u0932\u0947\u0924\u0947 \u0939\u0948\u0902\u0964 \u0906\u092A \u0906\u092E\u0924\u094C\u0930 \u092A\u0930 \u0915\u092C \u0930\u0941\u0915\u0924\u0947 \u0939\u0948\u0902?"
          ] },
          { key: "obj_send_info_qualify", base: 1.4, pool: [
            "\u0916\u0941\u0936\u0940 \u0938\u0947 \u092D\u0947\u091C \u0926\u0942\u0901\u0917\u0940, \u0914\u0930 \u0938\u0939\u0940 \u091A\u0940\u091C\u093C \u092D\u0947\u091C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F - \u0906\u092A\u0915\u0947 \u092E\u093E\u0932 \u0905\u092D\u0940 \u0915\u094C\u0928 \u092C\u0941\u0915 \u0915\u0930\u0924\u093E \u0939\u0948, \u0906\u092A \u092F\u093E \u0915\u094B\u0908 \u0921\u093F\u0938\u094D\u092A\u0948\u091A\u0930?",
            "\u092E\u0948\u0902 \u0906\u092A\u0915\u094B \u090F\u0915 \u0938\u093E\u0930\u093E\u0902\u0936 \u092D\u0947\u091C \u0926\u0942\u0901\u0917\u0940, \u0914\u0930 \u0906\u092A\u0915\u0940 \u0905\u0917\u0932\u0940 \u0921\u093F\u0932\u0940\u0935\u0930\u0940 \u0915\u0947 \u092C\u093E\u0926 \u092B\u093F\u0930 \u092C\u093E\u0924 \u0915\u0930\u0942\u0901\u0917\u0940 - \u0906\u091C \u092E\u093E\u0932 \u0915\u094C\u0928 \u0922\u0942\u0901\u0922\u0924\u093E \u0939\u0948?"
          ] },
          { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
            "\u0905\u091A\u094D\u091B\u093E - \u0907\u0938\u0915\u093E \u092E\u0924\u0932\u092C \u0906\u092A \u091C\u093E\u0928\u0924\u0947 \u0939\u0948\u0902 \u0915\u093F \u0921\u093F\u0938\u094D\u092A\u0948\u091A \u0916\u0941\u0926 \u092A\u0948\u0938\u093E \u0932\u093E\u0924\u093E \u0939\u0948\u0964 \u091C\u0932\u094D\u0926\u0940 \u092C\u0924\u093E\u0907\u090F: \u0909\u0928\u0915\u0947 \u0915\u093E\u092E \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0906\u092A\u0915\u094B \u0938\u092C\u0938\u0947 \u0905\u091A\u094D\u091B\u093E \u0915\u094D\u092F\u093E \u0932\u0917\u0924\u093E \u0939\u0948?",
            "\u0905\u0917\u0930 \u0906\u092A \u092A\u0939\u0932\u0947 \u0938\u0947 \u0915\u093F\u0938\u0940 \u0915\u0947 \u0938\u093E\u0925 \u0939\u0948\u0902, \u092C\u0922\u093C\u093F\u092F\u093E - \u092C\u0938 \u0907\u0924\u0928\u093E \u0915\u0939 \u0930\u0939\u0940 \u0939\u0942\u0901: \u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u092E\u0941\u091D\u0947 \u090F\u0915 \u092E\u093E\u0932 \u0922\u0942\u0901\u0922\u0928\u0947 \u0926\u0940\u091C\u093F\u090F, \u091A\u0932\u093E\u0907\u090F, \u0928\u0902\u092C\u0930 \u0938\u093E\u0925-\u0938\u093E\u0925 \u0926\u0947\u0916\u093F\u090F\u0964"
          ] },
          { key: "obj_rates_loss_aversion", base: 1.2, pool: [
            "\u0906\u092A \u0938\u0939\u0940 \u0939\u0948\u0902 - \u092C\u093E\u091C\u093C\u093E\u0930 \u0938\u093E\u0932\u094B\u0902 \u0938\u0947 \u0938\u092A\u093E\u091F \u0939\u0948\u0964 \u0907\u0938\u0940\u0932\u093F\u090F \u0939\u0930 \u092E\u093E\u0932 \u092A\u0930 \u0915\u094B\u0908 \u0938\u094C\u0926\u093E \u0915\u0930\u0928\u093E \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u0948\u0964 \u092C\u0940\u0938 \u0921\u0949\u0932\u0930 \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u0939\u0930 \u092E\u093E\u0932 \u092A\u0930, \u0939\u092B\u093C\u094D\u0924\u0947 \u092E\u0947\u0902 \u0924\u0940\u0928 - \u0938\u093E\u0932 \u092E\u0947\u0902 \u0924\u0940\u0928 \u0939\u091C\u093C\u093E\u0930 \u0938\u0947 \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u0921\u0949\u0932\u0930 \u0939\u093E\u0925 \u0938\u0947 \u091C\u093E\u0924\u0947 \u0939\u0948\u0902\u0964 \u0915\u094D\u092F\u093E \u0905\u0938\u0932\u0940 \u0928\u091C\u093C\u0930 \u0921\u093E\u0932\u0928\u093E \u091A\u093E\u0939\u093F\u090F?",
            "\u091C\u092C \u0926\u0930\u0947\u0902 \u0938\u092A\u093E\u091F \u0939\u094B\u0924\u0940 \u0939\u0948\u0902, \u0932\u0921\u093C\u093E\u0908 \u0926\u0930 \u092A\u0930 \u0939\u094B\u0924\u0940 \u0939\u0948, \u0938\u0921\u093C\u0915 \u092A\u0930 \u0928\u0939\u0940\u0902\u0964 \u0939\u092E \u0939\u0930 \u092E\u093E\u0932 \u092C\u0941\u0915 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0915\u093E\u0909\u0902\u091F\u0930 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964 \u0905\u0938\u0932\u0940 \u0928\u0902\u092C\u0930 \u0926\u093F\u0916\u093E\u090A\u0901?"
          ] }
        ],
        closeGood: [
          { key: "close_assumptive", base: 1.5, pool: [
            "\u0905\u092C \u0906\u0917\u0947 \u092F\u0939 \u0939\u094B\u0917\u093E - \u092E\u0948\u0902 \u0906\u091C \u0930\u093E\u0924 \u0906\u092A\u0915\u0940 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u092C\u0928\u093E \u0926\u0942\u0901\u0917\u0940, \u0914\u0930 \u0938\u0941\u092C\u0939 \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u0947 \u0906\u092A\u0915\u0947 \u0905\u0917\u0932\u0947 \u092E\u093E\u0932 \u0915\u0940 \u0924\u0932\u093E\u0936 \u0915\u0930\u0942\u0901\u0917\u0940\u0964 \u0915\u094D\u092F\u093E \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u0948\u0932\u0947\u0902\u0921\u0930 \u0939\u0948?",
            "\u0905\u0917\u0930 \u092F\u0939 \u0915\u093E\u092E \u0915\u0930\u0928\u093E \u0939\u0948, \u0905\u0917\u0932\u093E \u0915\u0926\u092E \u092A\u0902\u0926\u094D\u0930\u0939 \u092E\u093F\u0928\u091F \u0915\u0940 \u092C\u093E\u0924 \u0939\u0948 \u091C\u092C \u0906\u092A \u092A\u093E\u0930\u094D\u0915 \u0939\u094B\u0902\u0964 \u0906\u092A \u0906\u092E\u0924\u094C\u0930 \u092A\u0930 \u0915\u093F\u0924\u0928\u0947 \u092C\u091C\u0947 \u0909\u0920\u0924\u0947 \u0939\u0948\u0902?"
          ] }
        ],
        closeWarm: [
          { key: "close_backup_two_weeks", base: 1.4, pool: [
            "\u091A\u0942\u0901\u0915\u093F \u0906\u092A \u092A\u0939\u0932\u0947 \u0938\u0947 \u0915\u093F\u0938\u0940 \u0915\u0947 \u0938\u093E\u0925 \u0939\u0948\u0902, \u092F\u0939 \u0938\u092E\u091D\u094C\u0924\u093E \u0939\u0948 - \u091C\u094B \u092E\u093E\u0932 \u0935\u0947 \u0928\u0939\u0940\u0902 \u0926\u0947 \u092A\u093E\u0924\u0947, \u0909\u0938\u0915\u0947 \u0932\u093F\u090F \u092E\u0948\u0902 \u0926\u094B \u0939\u092B\u093C\u094D\u0924\u0947 \u0906\u092A\u0915\u0940 \u092C\u0948\u0915\u0905\u092A \u0930\u0939\u0942\u0901\u0964 \u092C\u093F\u0928\u093E \u0936\u0941\u0932\u094D\u0915\u0964",
            "\u0906\u091C \u0906\u092A\u0915\u094B \u0915\u0941\u091B \u0924\u092F \u0928\u0939\u0940\u0902 \u0915\u0930\u0928\u093E\u0964 \u092C\u0938 \u0907\u0924\u0928\u093E \u0915\u093F \u0905\u0917\u0932\u0940 \u0916\u093E\u0932\u0940 \u092F\u093E\u0924\u094D\u0930\u093E \u092C\u0941\u0915 \u092E\u0924 \u0915\u0940\u091C\u093F\u090F \u091C\u092C \u0924\u0915 \u092E\u0948\u0902 \u092C\u094B\u0930\u094D\u0921 \u0926\u093F\u0916\u093E \u0928 \u0926\u0942\u0901\u0964"
          ] }
        ]
      }
    };
    var QUESTIONS_BY_LOCALE = {
      en: [
        [
          "First, can I grab your {f}?",
          "To make sure I route this right - what's your {f}?",
          "Let me get your {f} so our team can reach you directly."
        ],
        [
          "And your {f}?",
          "Follow-up for you - your {f}?",
          "Need your {f} too, if you have it handy."
        ],
        [
          "Almost there - your {f}?",
          "One more for the sheet - your {f}?"
        ],
        [
          "Last one - your {f}?",
          "Final one, your {f}?"
        ]
      ],
      es: [
        [
          "Primero, \xBFme puede dar su {f}?",
          "Para asegurarme de enrutar bien - \xBFcu\xE1l es su {f}?",
          "D\xE9jeme tomar su {f} para que nuestro equipo le contacte directo."
        ],
        [
          "\xBFY su {f}?",
          "Para seguir - \xBFsu {f}?",
          "Tambi\xE9n necesito su {f}, si lo tiene a la mano."
        ],
        [
          "Casi terminamos - \xBFsu {f}?",
          "Una m\xE1s para el registro - \xBFsu {f}?"
        ],
        [
          "La \xFAltima - \xBFsu {f}?",
          "La final, \xBFsu {f}?"
        ]
      ],
      fr: [
        [
          "D'abord, est-ce que je peux avoir votre {f} ?",
          "Pour \xEAtre s\xFBr de bien router - c'est quoi votre {f} ?",
          "Donnez-moi votre {f} pour que notre \xE9quipe vous joigne directement."
        ],
        [
          "Et votre {f} ?",
          "Pour continuer - votre {f} ?",
          "Il me faut aussi votre {f}, si vous l'avez sous la main."
        ],
        [
          "On y est presque - votre {f} ?",
          "Encore une pour le registre - votre {f} ?"
        ],
        [
          "La derni\xE8re - votre {f} ?",
          "La toute derni\xE8re, votre {f} ?"
        ]
      ],
      de: [
        [
          "Zuerst, kann ich Ihre {f} bekommen?",
          "Damit ich richtig zuordne - wie lautet Ihre {f}?",
          "Ich brauche Ihre {f}, damit unser Team Sie direkt erreichen kann."
        ],
        [
          "Und Ihre {f}?",
          "Weiter f\xFCr Sie - Ihre {f}?",
          "Ich br\xE4uchte auch Ihre {f}, falls Sie es griffbereit haben."
        ],
        [
          "Fast geschafft - Ihre {f}?",
          "Noch eine f\xFCr die Liste - Ihre {f}?"
        ],
        [
          "Die letzte - Ihre {f}?",
          "Eine letzte, Ihre {f}?"
        ]
      ],
      pt: [
        [
          "Primeiro, posso pegar seu {f}?",
          "Para garantir o endere\xE7amento certo - qual \xE9 o seu {f}?",
          "Me d\xE1 seu {f} para que nossa equipe chegue at\xE9 voc\xEA direto."
        ],
        [
          "E seu {f}?",
          "Para seguir - seu {f}?",
          "Preciso do seu {f} tamb\xE9m, se estiver \xE0 m\xE3o."
        ],
        [
          "Quase l\xE1 - seu {f}?",
          "Mais um para o registro - seu {f}?"
        ],
        [
          "O \xFAltimo - seu {f}?",
          "O final, seu {f}?"
        ]
      ],
      hi: [
        [
          "\u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u0947, \u0915\u094D\u092F\u093E \u092E\u0941\u091D\u0947 \u0906\u092A\u0915\u093E {f} \u092E\u093F\u0932 \u0938\u0915\u0924\u093E \u0939\u0948?",
          "\u0938\u0939\u0940 \u092E\u093E\u0930\u094D\u0917 \u092A\u0930 \u092D\u0947\u091C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F - \u0906\u092A\u0915\u093E {f} \u0915\u094D\u092F\u093E \u0939\u0948?",
          "\u092E\u0941\u091D\u0947 \u0906\u092A\u0915\u093E {f} \u0932\u0947 \u0932\u0947\u0928\u0947 \u0926\u0940\u091C\u093F\u090F \u0924\u093E\u0915\u093F \u091F\u0940\u092E \u0938\u0940\u0927\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930 \u0938\u0915\u0947\u0964"
        ],
        [
          "\u0914\u0930 \u0906\u092A\u0915\u093E {f}?",
          "\u0906\u0917\u0947 \u092C\u0922\u093C\u0924\u0947 \u0939\u0948\u0902 - \u0906\u092A\u0915\u093E {f}?",
          "\u0906\u092A\u0915\u093E {f} \u092D\u0940 \u091A\u093E\u0939\u093F\u090F, \u0905\u0917\u0930 \u092A\u093E\u0938 \u092E\u0947\u0902 \u0939\u0948\u0964"
        ],
        [
          "\u092C\u0938 \u0939\u094B \u0917\u092F\u093E - \u0906\u092A\u0915\u093E {f}?",
          "\u0932\u093F\u0938\u094D\u091F \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0914\u0930 - \u0906\u092A\u0915\u093E {f}?"
        ],
        [
          "\u0906\u0916\u093F\u0930\u0940 \u090F\u0915 - \u0906\u092A\u0915\u093E {f}?",
          "\u0905\u0902\u0924\u093F\u092E, \u0906\u092A\u0915\u093E {f}?"
        ]
      ]
    };
    var RETRY_BY_LOCALE = {
      en: [
        "No worries, I didn't quite catch it - can you say your {f} once more?",
        "Sorry, one crackly line - your {f}?"
      ],
      es: [
        "Sin problema, no le escuch\xE9 bien - \xBFme repite su {f}?",
        "Perd\xF3n, la l\xEDnea se cort\xF3 un poco - \xBFsu {f}?"
      ],
      fr: [
        "Pas de souci, je n'ai pas bien entendu - pouvez-vous r\xE9p\xE9ter votre {f} ?",
        "D\xE9sol\xE9, la ligne gr\xE9sille un peu - votre {f} ?"
      ],
      de: [
        "Kein Problem, ich habe es nicht ganz verstanden - k\xF6nnen Sie Ihre {f} noch einmal wiederholen?",
        "Entschuldigung, die Leitung war schlecht - Ihre {f}?"
      ],
      pt: [
        "Sem problema, n\xE3o entendi direito - pode repetir seu {f}?",
        "Desculpa, a linha caiu um pouco - seu {f}?"
      ],
      hi: [
        "\u0915\u094B\u0908 \u092C\u093E\u0924 \u0928\u0939\u0940\u0902, \u0920\u0940\u0915 \u0938\u0947 \u0928\u0939\u0940\u0902 \u0938\u0941\u0928\u093E\u0908 \u0926\u093F\u092F\u093E - \u0915\u094D\u092F\u093E \u0906\u092A \u0905\u092A\u0928\u093E {f} \u0926\u094B\u0939\u0930\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902?",
        "\u092E\u093E\u092B\u093C \u0915\u0940\u091C\u093F\u090F, \u0932\u093E\u0907\u0928 \u0925\u094B\u0921\u093C\u0940 \u0915\u091F \u0930\u0939\u0940 \u0925\u0940 - \u0906\u092A\u0915\u093E {f}?"
      ]
    };
    var REOPEN_BY_LOCALE = {
      en: [
        "Hello? Just making sure we didn't get cut off - are you still there?",
        "Hello, are you there? I think the line dropped for a second."
      ],
      es: [
        "\xBFHola? Solo para confirmar que no se cort\xF3 - \xBFsigue ah\xED?",
        "\xBFHola, est\xE1 ah\xED? Creo que la l\xEDnea se cay\xF3 un segundo."
      ],
      fr: [
        "All\xF4 ? Je v\xE9rifie juste qu'on ne s'est pas coup\xE9s - vous \xEAtes toujours l\xE0 ?",
        "All\xF4, vous \xEAtes l\xE0 ? Je crois que la ligne a saut\xE9 une seconde."
      ],
      de: [
        "Hallo? Nur um sicherzugehen, dass wir nicht unterbrochen wurden - sind Sie noch dran?",
        "Hallo, sind Sie noch da? Ich glaube, die Leitung hat kurz ausgesetzt."
      ],
      pt: [
        "Ol\xE1? S\xF3 confirmando que n\xE3o ca\xEDmos o sinal - voc\xEA ainda est\xE1 a\xED?",
        "Ol\xE1, est\xE1 a\xED? Acho que a linha caiu por um segundo."
      ],
      hi: [
        "\u0939\u0947\u0932\u094B? \u092C\u0938 \u092F\u0939 \u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930 \u0930\u0939\u0940 \u0939\u0942\u0901 \u0932\u093E\u0907\u0928 \u0915\u091F\u0940 \u0928\u0939\u0940\u0902 - \u0915\u094D\u092F\u093E \u0906\u092A \u0935\u0939\u0940\u0902 \u0939\u0948\u0902?",
        "\u0939\u0947\u0932\u094B, \u0906\u092A \u0935\u0939\u093E\u0901 \u0939\u0948\u0902? \u0932\u0917\u0924\u093E \u0939\u0948 \u0932\u093E\u0907\u0928 \u090F\u0915 \u0938\u0947\u0915\u0902\u0921 \u0917\u093F\u0930 \u0917\u0908 \u0925\u0940\u0964"
      ]
    };
    var DEADAIR_BY_LOCALE = {
      en: "I can't hear you at the moment. I'll give you a call back a little later - take care and talk soon!",
      es: "No le escucho en este momento. Le vuelvo a llamar m\xE1s tarde - \xA1cu\xEDdese y hablamos pronto!",
      fr: "Je ne vous entends plus pour le moment. Je vous rappelle un peu plus tard - prenez soin de vous et \xE0 bient\xF4t !",
      de: "Ich kann Sie gerade nicht h\xF6ren. Ich rufe Sie sp\xE4ter noch einmal an - passen Sie auf sich auf und bis bald!",
      pt: "N\xE3o estou conseguindo te ouvir agora. Vou te ligar de volta mais tarde - se cuide e a gente se fala!",
      hi: "\u092E\u0948\u0902 \u0905\u092D\u0940 \u0906\u092A\u0915\u094B \u0938\u0941\u0928 \u0928\u0939\u0940\u0902 \u092A\u093E \u0930\u0939\u0940 \u0939\u0942\u0901\u0964 \u092E\u0948\u0902 \u0925\u094B\u0921\u093C\u0940 \u0926\u0947\u0930 \u092C\u093E\u0926 \u092B\u093F\u0930 \u0915\u0949\u0932 \u0915\u0930\u0942\u0901\u0917\u0940 - \u0905\u092A\u0928\u093E \u0916\u094D\u092F\u093E\u0932 \u0930\u0916\u093F\u090F \u0914\u0930 \u091C\u0932\u094D\u0926\u0940 \u092C\u093E\u0924 \u0915\u0930\u0947\u0902\u0917\u0947!"
    };
    var HANDOFF_BY_LOCALE = {
      en: "No problem at all - one second, I'll get you straight over to one of our real people.",
      es: "Sin problema - un segundo, le paso directo con una persona real de nuestro equipo.",
      fr: "Pas de souci - une seconde, je vous passe directement \xE0 une vraie personne de notre \xE9quipe.",
      de: "Kein Problem - einen Moment, ich verbinde Sie direkt mit einer echten Person aus unserem Team.",
      pt: "Sem problema - um segundo, vou te passar direto para uma pessoa real do nosso time.",
      hi: "\u0915\u094B\u0908 \u092C\u093E\u0924 \u0928\u0939\u0940\u0902 - \u090F\u0915 \u0938\u0947\u0915\u0902\u0921, \u092E\u0948\u0902 \u0906\u092A\u0915\u094B \u0938\u0940\u0927\u0947 \u0939\u092E\u093E\u0930\u0940 \u0905\u0938\u0932\u0940 \u091F\u0940\u092E \u0938\u0947 \u091C\u094B\u0921\u093C \u0926\u0947\u0924\u0940 \u0939\u0942\u0901\u0964"
    };
    var GRACEFUL_BY_LOCALE = {
      en: [
        "Alright, I hear you - I'll take you off the list. If a hot load in your lane ever needs a truck, can our dispatcher email you as a courtesy? Either way, have a safe one.",
        "No problem at all. I'll make a note not to bother you again. If you ever want loads, just give us a shout - take care!"
      ],
      es: [
        "Entiendo - lo quito de la lista. Si alguna vez un buen flete en su zona necesita cami\xF3n, \xBFpuede nuestro despachador enviarle un correo como cortes\xEDa? De cualquier forma, buen viaje.",
        "Sin problema. Anoto que no le molestamos m\xE1s. Si alg\xFAn d\xEDa necesita fletes, solo av\xEDsenos - \xA1cu\xEDdese!"
      ],
      fr: [
        "Tr\xE8s bien, je comprends - je vous retire de la liste. Si un bon chargement dans votre secteur a besoin d'un camion, notre dispatcher peut-il vous \xE9crire par courtoisie ? Dans tous les cas, bonne route.",
        "Pas de souci. Je note de ne plus vous d\xE9ranger. Si vous avez besoin de chargements un jour, appelez-nous - prenez soin de vous !"
      ],
      de: [
        "Alles klar, ich verstehe - ich nehme Sie von der Liste. Wenn mal eine hei\xDFe Ladung in Ihrer Region einen Lkw braucht, darf unser Disponent Ihnen h\xF6flich schreiben? Wie auch immer - gute Fahrt.",
        "Kein Problem. Ich mache mir eine Notiz, Sie nicht mehr zu st\xF6ren. Wenn Sie je Ladung brauchen, melden Sie sich einfach - passen Sie auf sich auf!"
      ],
      pt: [
        "Tudo bem, eu entendi - vou te tirar da lista. Se algum dia um bom frete na sua regi\xE3o precisar de caminh\xE3o, nosso despachante pode te avisar por e-mail como cortesia? De qualquer jeito, boa viagem.",
        "Sem problema. Vou anotar para n\xE3o te incomodar mais. Se um dia precisar de fretes, \xE9 s\xF3 chamar - se cuida!"
      ],
      hi: [
        "\u0920\u0940\u0915 \u0939\u0948, \u092E\u0948\u0902 \u0938\u092E\u091D \u0917\u0908 - \u092E\u0948\u0902 \u0906\u092A\u0915\u094B \u0938\u0942\u091A\u0940 \u0938\u0947 \u0939\u091F\u093E \u0926\u0947\u0924\u0940 \u0939\u0942\u0901\u0964 \u0905\u0917\u0930 \u0915\u092D\u0940 \u0906\u092A\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0905\u091A\u094D\u091B\u093E \u092E\u093E\u0932 \u091F\u094D\u0930\u0915 \u092E\u093E\u0901\u0917\u0947, \u0924\u094B \u0915\u094D\u092F\u093E \u0939\u092E\u093E\u0930\u093E \u0921\u093F\u0938\u094D\u092A\u0948\u091A\u0930 \u0906\u092A\u0915\u094B \u0908\u092E\u0947\u0932 \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0948? \u092B\u093F\u0930 \u092D\u0940, \u092F\u093E\u0924\u094D\u0930\u093E \u0936\u0941\u092D \u0939\u094B\u0964",
        "\u0915\u094B\u0908 \u092C\u093E\u0924 \u0928\u0939\u0940\u0902\u0964 \u092E\u0948\u0902 \u0927\u094D\u092F\u093E\u0928 \u0926\u0947 \u0932\u0942\u0901\u0917\u0940 \u0915\u093F \u0926\u094B\u092C\u093E\u0930\u093E \u092A\u0930\u0947\u0936\u093E\u0928 \u0928 \u0915\u0930\u0942\u0901\u0964 \u0905\u0917\u0930 \u0915\u092D\u0940 \u092E\u093E\u0932 \u091A\u093E\u0939\u093F\u090F, \u092C\u0938 \u092C\u0924\u093E \u0926\u0940\u091C\u093F\u090F - \u0927\u094D\u092F\u093E\u0928 \u0930\u0916\u093F\u090F!"
      ]
    };
    var ACK_BY_LOCALE = {
      en: [
        "That's good to know, thanks.",
        "I really appreciate you sharing that.",
        "Perfect, that helps me a lot.",
        "Got it, that makes sense.",
        "Thanks for the detail - that's exactly what I needed."
      ],
      es: [
        "Bueno saberlo, gracias.",
        "Aprecio mucho que me lo comparta.",
        "Perfecto, eso me ayuda bastante.",
        "Entendido, tiene sentido.",
        "Gracias por el detalle - es justo lo que necesitaba."
      ],
      fr: [
        "C'est bon \xE0 savoir, merci.",
        "J'appr\xE9cie vraiment que vous me le partagiez.",
        "Parfait, \xE7a m'aide beaucoup.",
        "Compris, \xE7a a du sens.",
        "Merci pour le d\xE9tail - c'est exactement ce qu'il me fallait."
      ],
      de: [
        "Gut zu wissen, danke.",
        "Ich wei\xDF es wirklich zu sch\xE4tzen, dass Sie das teilen.",
        "Perfekt, das hilft mir sehr.",
        "Verstanden, das ergibt Sinn.",
        "Danke f\xFCr das Detail - genau das brauchte ich."
      ],
      pt: [
        "Que bom saber, obrigado.",
        "Agrade\xE7o muito voc\xEA compartilhar isso.",
        "Perfeito, isso me ajuda bastante.",
        "Entendi, faz sentido.",
        "Obrigado pelo detalhe - \xE9 exatamente o que eu precisava."
      ],
      hi: [
        "\u092F\u0939 \u091C\u093E\u0928\u0915\u0930 \u0905\u091A\u094D\u091B\u093E \u0932\u0917\u093E, \u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964",
        "\u0906\u092A\u0915\u0947 \u0936\u0947\u092F\u0930 \u0915\u0930\u0928\u0947 \u0915\u0940 \u092C\u0939\u0941\u0924 \u0938\u0930\u093E\u0939\u0928\u093E\u0964",
        "\u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0938\u0939\u0940, \u0907\u0938\u0938\u0947 \u092E\u0941\u091D\u0947 \u092C\u0939\u0941\u0924 \u092E\u0926\u0926 \u092E\u093F\u0932\u0924\u0940 \u0939\u0948\u0964",
        "\u0938\u092E\u091D \u0917\u0908, \u092F\u0939 \u0938\u092E\u091D \u0906\u0924\u093E \u0939\u0948\u0964",
        "\u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0915\u0947 \u0932\u093F\u090F \u0927\u0928\u094D\u092F\u0935\u093E\u0926 - \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0935\u0939\u0940 \u091C\u094B \u092E\u0941\u091D\u0947 \u091A\u093E\u0939\u093F\u090F \u0925\u093E\u0964"
      ]
    };
    var CALLBACK_CLOSE_BY_LOCALE = {
      en: "Perfect{who}! My manager will call you back{inTime} from {number}. Keep your phone close - great talking with you!",
      es: "\xA1Perfecto{who}! Mi gerente le devolver\xE1 la llamada{inTime} desde {number}. Tenga el tel\xE9fono cerca - \xA1fue un gusto hablar con usted!",
      fr: "Parfait{who} ! Mon responsable vous rappellera{inTime} depuis {number}. Gardez votre t\xE9l\xE9phone pr\xE8s de vous - ce fut un plaisir !",
      de: "Perfekt{who}! Mein Manager ruft Sie{inTime} unter {number} zur\xFCck. Halten Sie Ihr Telefon bereit - sch\xF6n, mit Ihnen gesprochen zu haben!",
      pt: "Perfeito{who}! Meu gerente vai ligar de volta{inTime} do {number}. Deixe o telefone por perto - foi \xF3timo falar com voc\xEA!",
      hi: "\u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0938\u0939\u0940{who}! \u092E\u0947\u0930\u0947 \u092E\u0948\u0928\u0947\u091C\u0930{inTime} {number} \u0938\u0947 \u0906\u092A\u0915\u094B \u0915\u0949\u0932 \u0915\u0930\u0947\u0902\u0917\u0947\u0964 \u092B\u093C\u094B\u0928 \u092A\u093E\u0938 \u092E\u0947\u0902 \u0930\u0916\u093F\u090F - \u0906\u092A\u0938\u0947 \u092C\u093E\u0924 \u0915\u0930\u0915\u0947 \u0905\u091A\u094D\u091B\u093E \u0932\u0917\u093E!"
    };
    function ackFor(locale, leadText, seed) {
      const loc = normalizeLocale(locale);
      const generic = ACK_BY_LOCALE[loc] || ACK_BY_LOCALE.en;
      if (loc === "en") {
        const words = String(leadText || "").split(/\s+/).filter((w) => DIGIT_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
        if (words.length >= 2) {
          const map = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", oh: "0", ten: "10", twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90", hundred: "100", thousand: "1000" };
          const digits2 = words.map((w) => map[w.toLowerCase().replace(/[^a-z]/g, "")] || w);
          return `Great, that's saved - ${digits2.join("")} ${DONE_BY_LOCALE.en[Math.abs(seed) % 3]}`;
        }
      }
      const digits = String(leadText || "").match(/\d{2,}/);
      if (digits) {
        const done = (DONE_BY_LOCALE[loc] || DONE_BY_LOCALE.en)[Math.abs(seed) % 3];
        return `${generic[Math.abs(seed + 4) % generic.length].replace(/\.$/, "")} - ${digits[0]}, ${done}`;
      }
      return generic[Math.abs(seed) % generic.length];
    }
    var DONE_BY_LOCALE = {
      en: ["got it.", "on the sheet.", "thank you."],
      es: ["listo.", "en la lista.", "gracias."],
      fr: ["c'est not\xE9.", "sur la liste.", "merci."],
      de: ["notiert.", "auf der Liste.", "danke."],
      pt: ["anotado.", "na lista.", "obrigado."],
      hi: ["\u0928\u094B\u091F \u0939\u094B \u0917\u092F\u093E\u0964", "\u0932\u093F\u0938\u094D\u091F \u092E\u0947\u0902 \u0939\u0948\u0964", "\u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964"]
    };
    var DIGIT_WORDS = /* @__PURE__ */ new Set(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "oh", "ten", "twenty", "thirty", "forty", "fifty", "hundred", "thousand"]);
    function poolsFor(locale) {
      const loc = normalizeLocale(locale);
      return POOLS_BY_LOCALE[loc] || POOLS_BY_LOCALE.en;
    }
    function callbackCloseFor(locale, who, inTime, number) {
      const loc = normalizeLocale(locale);
      const tpl = CALLBACK_CLOSE_BY_LOCALE[loc] || CALLBACK_CLOSE_BY_LOCALE.en;
      return tpl.replace(/\{who\}/g, who).replace(/\{inTime\}/g, inTime).replace(/\{number\}/g, number);
    }
    function questionsFor(locale, field, asked) {
      const loc = normalizeLocale(locale);
      const stages = QUESTIONS_BY_LOCALE[loc] || QUESTIONS_BY_LOCALE.en;
      const pool = stages[Math.min(asked, stages.length - 1)];
      return pool[Math.abs(asked * 7 + field.length) % pool.length].replace(/\{f\}/g, field);
    }
    function retryFor(locale, field) {
      const loc = normalizeLocale(locale);
      const opts = RETRY_BY_LOCALE[loc] || RETRY_BY_LOCALE.en;
      return opts[String(field).length % opts.length].replace(/\{f\}/g, String(field).toLowerCase());
    }
    function pick(arr, seed) {
      return arr[Math.abs(seed) % arr.length];
    }
    var FRIENDLY_BY_LOCALE = {
      en: [
        "Ha, fair enough - I love a conversation that stays interesting. Quick answer for you, then back to business.",
        "You know what, that's a good question and you deserve a straight one. Here's the honest version, then let me loop back to the reason I called.",
        "Honestly? I'm the type who actually likes hearing that. Let me give you a real answer and then one quick question back.",
        "I appreciate you talking to me like a person - that's rare on these calls. Straight answer coming up.",
        "Totally fair play. Let me answer that in plain English, then I've got a thirty-second thing for you."
      ],
      es: ["Buena pregunta - te la respondo con franqueza y volvemos al grano."],
      fr: ["Bonne question - je r\xE9ponds franchement, puis on reprend le fil."],
      de: ["Berechtigte Frage - ich antworte offen und wir kommen schnell zur Sache."],
      pt: ["Boa pergunta - respondo com franqueza e voltamos ao assunto."],
      hi: ["Achha sawal hai - seedha jawaab deta hoon, phir ek chhota sa sawal."]
    };
    var QUESTION_BY_LOCALE = {
      en: /\b(how|what|why|when|who|where|which|can you|could you|will you|do you|are you|is it|are there)\b/i,
      es: /\b(c\u00f3mo|qu\u00e9|por qu\u00e9|cu\u00e1ndo|qui\u00e9n|d\u00f3nde|puedes|puede)\b/i,
      fr: /\b(comment|quoi|pourquoi|quand|qui|o\u00f9|pouvez|peux)\b/i,
      de: /\b(warum|was|wie|wann|wer|wo|k\u00f6nnen|kannst)\b/i,
      pt: /\b(como|o que|por que|quando|quem|onde|pode|voc\u00ea)\b/i,
      hi: /\b(kya|kaise|kyun|kab|kaun|kahan|aap)\b/i
    };
    var STOP_WORDS = /* @__PURE__ */ new Set(
      ["the", "a", "an", "to", "of", "on", "in", "for", "and", "or", "with", "about", "my", "i", "you", "it", "me", "is", "are", "be", "have", "has", "will", "would", "can", "do", "we", "they", "this", "that", "but", "so", "because", "not", "just", "only"]
    );
    function signatureOf(text) {
      const words = String(text || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
      const uniq = Array.from(new Set(words)).slice(0, 2);
      return uniq.join(" ");
    }
    module2.exports = {
      normalizeLocale,
      detectLanguage,
      lex,
      poolsFor,
      callbackCloseFor,
      questionsFor,
      retryFor,
      ackFor,
      pick,
      NEGATIVE_BY_LOCALE,
      SOFT_BY_LOCALE,
      POSITIVE_BY_LOCALE,
      NEGATIVE_WORDS_BY_LOCALE,
      HUMAN_BY_LOCALE,
      REOPEN_BY_LOCALE,
      DEADAIR_BY_LOCALE,
      HANDOFF_BY_LOCALE,
      GRACEFUL_BY_LOCALE,
      ACK_BY_LOCALE,
      CALLBACK_CLOSE_BY_LOCALE,
      POOLS_BY_LOCALE,
      SUPPORTED_LOCALES: Object.keys(POOLS_BY_LOCALE),
      FRIENDLY_BY_LOCALE,
      QUESTION_BY_LOCALE,
      signatureOf
    };
  }
});

// agent/brain.js
var require_brain = __commonJS({
  "agent/brain.js"(exports2, module2) {
    "use strict";
    var STRATEGY_INFO = {
      intro_company_first: { name: "Company-first introduction", source: "customer config", why: "The lead hears your company, not ours." },
      hook_permission_timebox: { name: "Permission + timebox opener", source: "Gong Labs (300M calls)", why: "Naming a 30-second contract makes the ask tiny and reversible - ~11% success when paired with a reason." },
      hook_how_have_you_been: { name: "'How have you been?' pattern interrupt", source: "Gong Labs (90,380 calls)", why: "6.6x more meetings than baseline by refusing a sales greeting." },
      hook_reason_first: { name: "Reason-first statement", source: "CallHippo (72,000 calls)", why: "Stating the reason in the first 30 seconds = 2.1x outcomes." },
      hook_specificity: { name: "Specific observed-data opener", source: "CallHippo", why: "Specific lane/truck detail is the #1 predictor of a kept call." },
      hook_social_proof: { name: "Social-proof entrance", source: "Gong Labs", why: "Second-best opener at 11.24% - implies peer credibility." },
      rapport_we_language: { name: "We-language rapport", source: "Gong Labs", why: "Winning calls use 'we/our' 35-55% more than 'I/my'." },
      rapport_mirroring: { name: "Tone & pace mirroring", source: "Pipedrive / HubSpot", why: "Mirroring moves outcomes toward agreement 67% of the time." },
      obj_not_interested: { name: "Pattern-interrupt objection turn", source: "Prospeo / Gong", why: "~50% of 'not interested' is a reflexive brush-off before value lands - interrupt, then reframe." },
      obj_busy_callback_slot: { name: "Busy-driver callback slot", source: "Cognism", why: "Unbooked callbacks convert ~34% worse; a pinned slot saves the deal." },
      obj_send_info_qualify: { name: "Qualify-before-send", source: "Prospeo", why: "90% of 'send me info' is a polite exit; one question keeps it a conversation." },
      obj_have_dispatcher_one_load: { name: "One-load side-by-side trial", source: "Nexloads / ATRI", why: "Existing dispatcher = proof dispatch pays; a one-load comparison wins without attacking." },
      obj_rates_loss_aversion: { name: "Loss-aversion rate reframe", source: "Kahneman & Tversky / OOIDA", why: "Spot ~$1.88/mi for 3+ years; frame as money donated, not money to earn." },
      close_assumptive: { name: "Assumptive close", source: "Gong Labs", why: "'Do you have your calendar handy?' is the highest-conversion closer on record." },
      close_one_load_trial: { name: "One-load prove-it close", source: "Sandler", why: "Small reversible commitments convert; ideal after 2+ positive qualifiers." },
      close_backup_two_weeks: { name: "Backup-dispatcher offer", source: "RAIN Group", why: "Low-risk entry with an existing provider - nothing to switch, everything to compare." },
      close_callback_number: { name: "Service manager call-back", source: "customer config", why: "A named number + time makes the next step concrete for service sales." }
    };
    var I18N = require_brain_i18n();
    var POOLS = I18N.poolsFor("en");
    function pick(arr, seed = Math.floor(Math.random() * 1e9)) {
      return arr[Math.floor(Math.abs(seed)) % arr.length];
    }
    function pickStrategy(group, scoreMap, pools, seed) {
      const pool = pools[group] || [];
      if (!pool.length) return null;
      const weighted = pool.map((p) => {
        const learned = scoreMap ? Number(scoreMap[p.key] || 0) : 0;
        const w = Math.max(0.15, p.base + 0.5 * learned);
        return { p, w };
      });
      const total = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.abs(seed) % 1e3 / 1e3 * total;
      for (const x of weighted) {
        r -= x.w;
        if (r <= 0) return x.p;
      }
      return weighted[weighted.length - 1].p;
    }
    function makeBrain({ product, leadFields, persona = "high-energy friendly female", companyName = "our team", learning = {}, locale = "en" }) {
      const fields = Array.isArray(leadFields) ? leadFields.filter(Boolean) : [];
      const agentName = friendlyName(persona);
      const company = String(companyName || "").trim() || "our team";
      const scoreMap = learning.strategyScores || {};
      const used = [];
      const loc = I18N.normalizeLocale(locale);
      const pools = I18N.poolsFor(loc);
      const intro = `This is ${agentName} from ${company}.`;
      const g = (s) => ({ group: s, used, agentName, company, intro });
      const missLog = [];
      const friendlyLog = [];
      function fill(template) {
        return String(template).replace(/\{agent\}/g, agentName).replace(/\{company\}/g, company);
      }
      return {
        product,
        company,
        fields,
        persona,
        locale: loc,
        agentName,
        learning,
        used,
        usedFriendly: friendlyLog,
        missed: missLog,
        strategyManifest: STRATEGY_INFO,
        /**
         * True when the caller asked us something instead of answering (Question
         * Detection): these get a warm real answer, then a steer back.
         */
        isQuestion(text) {
          const re = I18N.QUESTION_BY_LOCALE[loc] || I18N.QUESTION_BY_LOCALE.en;
          return re.test(String(text || ""));
        },
        /**
         * Warm, personalized answer to an unexpected question: acknowledges it,
         * names the product, then offers to keep going. Never parrots the script.
         */
        answerQuestion(text) {
          const seed = Array.from(String(text || "")).reduce((s, ch) => s + ch.charCodeAt(0), 0);
          return I18N.pick(
            [
              `That's a fair question, and here's the honest answer: we keep owner-operators loaded back-to-back with ${product}. I know that's the part that actually matters. Want me to tell you how it works in thirty seconds?`,
              `Good question - straight answer: this is about ${product}, and I'd rather you hear the real deal than a rehearsed pitch. Give me thirty seconds, then it's your call.`,
              `I like that you asked. Plain answer: we're about ${product} - no fluff, no bait. Can I show you how that works for you specifically, real quick?`
            ],
            seed + 1
          );
        },
        /**
         * Friendly handling for anything off-script that isn't an objection and
         * isn't a question either (small talk, odd comments, half-answers). Uses
         * the custom intent learned from past calls when one matches; otherwise a
         * warm pool line. Records the miss so it can be learned next time.
         */
        friendlyFor(text) {
          const sig = I18N.signatureOf(text);
          const t = String(text || "").toLowerCase();
          const custom = (learning.customIntent || {})[sig];
          if (custom && custom.used >= 1) {
            used.push("ai_custom_intent");
            friendlyLog.push(sig);
            return custom.answer;
          }
          if (t && t.length < 4 && /\b(yep|ok|okay|sure|alright|fine)\b/.test(t)) return null;
          if (!sig) return null;
          const seed = Array.from(t).reduce((s, ch) => s + ch.charCodeAt(0), 0);
          missLog.push({ sig, text: String(text).slice(0, 120), at: Date.now() });
          friendlyLog.push(sig);
          return I18N.pick(I18N.FRIENDLY_BY_LOCALE[loc] || I18N.FRIENDLY_BY_LOCALE.en, seed);
        },
        opening(seed) {
          const s = pickStrategy("opening", scoreMap, pools, seed);
          if (s) used.push(s.key);
          const body = fill(pick(s.pool, seed + 7));
          return loc === "en" ? `${intro} ${body}` : body;
        },
        rapport(seed) {
          const s = pickStrategy("rapport", scoreMap, pools, seed);
          if (s) used.push(s.key);
          return fill(pick(s.pool, seed));
        },
        question(field, asked) {
          return I18N.questionsFor(loc, field, asked);
        },
        retryQuestion(field) {
          return I18N.retryFor(loc, field);
        },
        reopenOut() {
          return I18N.pick(I18N.REOPEN_BY_LOCALE[loc] || I18N.REOPEN_BY_LOCALE.en, 2);
        },
        deadAirClose() {
          return I18N.DEADAIR_BY_LOCALE[loc] || I18N.DEADAIR_BY_LOCALE.en;
        },
        handoff() {
          return I18N.HANDOFF_BY_LOCALE[loc] || I18N.HANDOFF_BY_LOCALE.en;
        },
        reflect(leadText, seed) {
          const t = String(leadText || "").toLowerCase();
          if (loc !== "en") return I18N.ackFor(loc, leadText, seed);
          if (t.includes("good morning") || t.includes("good afternoon") || t.includes("good evening")) {
            return pick(["And a good one to you too!", "Likewise, thanks!"], seed);
          }
          if (/\bthanks\b|\bthank you\b/.test(t)) return "Anytime!";
          return pick(
            [
              "That's good to know, thanks.",
              "I really appreciate you sharing that.",
              "Perfect, that helps me a lot.",
              "Got it, that makes sense.",
              "Thanks for the detail - that's exactly what I needed."
            ],
            seed
          );
        },
        ackFor(leadText, seed) {
          return I18N.ackFor(loc, leadText, seed);
        },
        pivotSoft(seed, objectionText) {
          const text = String(objectionText || "").toLowerCase();
          let s;
          if (/\b(driving|drive|on the road|busy|rolling|shutting down|parked now)\b/.test(text)) s = pickByKey(pools.pivot, "obj_busy_callback_slot", scoreMap, seed);
          else if (/info|email|send|one.pager|look at it/.test(text)) s = pickByKey(pools.pivot, "obj_send_info_qualify", scoreMap, seed);
          else if (/dispatcher|broker|have someone|got a guy|leased to/.test(text)) s = pickByKey(pools.pivot, "obj_have_dispatcher_one_load", scoreMap, seed);
          else if (/\b(market is bad|market's bad|slow market)\b|\brate\b|rates|slow|bad market|no freight|no loads|board is dead/.test(text)) s = pickByKey(pools.pivot, "obj_rates_loss_aversion", scoreMap, seed);
          else s = pickStrategy("pivot", scoreMap, pools, seed);
          used.push(s.key);
          return fill(pick(s.pool, seed + 3));
        },
        pivotGraceful() {
          const seed = 5;
          const s = pickStrategy("pivot", scoreMap, pools, seed);
          used.push(s.key + "_exit");
          return I18N.pick(I18N.GRACEFUL_BY_LOCALE[loc] || I18N.GRACEFUL_BY_LOCALE.en, seed);
        },
        qualifyingClose(goodLead, name, { callbackNumber, callbackIn } = {}) {
          const who = name ? `, ${name}` : "";
          if (goodLead && callbackNumber) {
            used.push("close_callback_number");
            const inTime = callbackIn ? ` in ${callbackIn}` : "";
            return I18N.callbackCloseFor(loc, who, inTime, callbackNumber);
          }
          if (goodLead) {
            const s = pickByKey(pools.closeGood, "close_assumptive", scoreMap, 11);
            const w = pickByKey(pools.closeWarm, "close_backup_two_weeks", scoreMap, 3);
            used.push(s.key, w.key);
            const line = `${loc === "en" ? "Perfect" + who + ". " : who ? "Perfecto" + who + ". " : "Perfecto. "}${fill(pick(s.pool, 11))} ${fill(pick(w.pool, 3))}`;
            return line;
          }
          const bye = loc === "en" ? "Thanks for your time today - if anything changes, you know where to find us. Take care!" : loc === "es" ? "Gracias por su tiempo hoy - si algo cambia, ya sabe d\uFFFDnde encontrarnos. \uFFFDCu\uFFFDdese!" : loc === "fr" ? "Merci pour votre temps - si \uFFFDa change, vous savez o\uFFFD nous trouver. Prenez soin de vous !" : loc === "de" ? "Danke f\uFFFDr Ihre Zeit - wenn sich etwas \uFFFDndert, wissen Sie, wo Sie uns finden. Passen Sie auf sich auf!" : loc === "pt" ? "Obrigado pelo seu tempo - se algo mudar, voc\uFFFD j\uFFFD sabe onde nos encontrar. Se cuida!" : "???? ??? ?? ??? ??????? - ??? ??? ????? ??, ?? ?? ????? ??? ?? ???? ???? ???? ??? ????? ????!";
          return bye;
        }
      };
    }
    function pickByKey(group, key, scoreMap, seed) {
      const s = group.find((p) => p.key === key) || group[0];
      return s;
    }
    var NAME_TOKENS = /* @__PURE__ */ new Set(["to", "the", "and", "of", "in", "a", "an", "for", "with", "on", "at", "my", "your", "name", "is"]);
    var DESCRIPTOR_TOKENS = /(high|energy|friendly|female|male|assistant|magic|dialer|agent|professional|business|personality|persona|helpful|polite|courteous|cheerful|energetic|smart|lady|woman|man|girl|guy|voice|service|tone|warm|natural|human|caller|verified|active|premium|default|basic|standard)/i;
    function friendlyName(persona) {
      const s = String(persona || "").trim();
      const part = s.split(/[\s,]+/).find((w) => {
        const clean2 = w.replace(/[^A-Za-z]/g, "").toLowerCase();
        if (!clean2 || clean2.length < 2 || clean2.length > 12) return false;
        if (NAME_TOKENS.has(clean2)) return false;
        if (DESCRIPTOR_TOKENS.test(clean2)) return false;
        return true;
      });
      if (!part) return "Autumn";
      const clean = part.replace(/[^a-zA-Z]/g, "").toLowerCase();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    function scoreLead({ transcript, fields, locale = "en" }) {
      const loc = I18N.normalizeLocale(locale);
      const text = transcript.map((t) => t.role === "lead" ? t.text : "").join(" ").toLowerCase();
      let positive;
      let negative;
      if (loc === "en") {
        positive = /\b(yes|interested|how much|cost|price|quote|need|looking for|that sounds|go ahead|sure|okay|ok)\b/;
        negative = /\b(no|not interested|no thanks|stop|don't call|never mind|scam|not now|busy|too busy)\b/;
      } else {
        const posWords = I18N.POSITIVE_BY_LOCALE[loc] || I18N.POSITIVE_BY_LOCALE.en;
        const negWords = I18N.NEGATIVE_WORDS_BY_LOCALE[loc] || I18N.NEGATIVE_WORDS_BY_LOCALE.en;
        positive = I18N.lex(posWords);
        negative = I18N.lex(negWords);
      }
      let score = 0.5;
      const posHits = (text.match(positive) || []).length;
      score += posHits * 0.3;
      if (negative.test(text)) {
        score = Math.min(score, 0.25);
      }
      const realAnswers = transcript.filter((t) => t.role === "lead" && !t.text.startsWith("(silence)")).length;
      const answeredBoth = realAnswers >= 2;
      const maxAttemptsOfRejection = transcript.filter((t) => t.role === "lead" && negative.test(t.text.toLowerCase())).length;
      return {
        score,
        goodLead: score >= 0.6 && answeredBoth,
        maxAttemptsOfRejection
      };
    }
    function shouldEscalate({ goodLead, maxAttemptsOfRejection, hearsHumanRequest, locale = "en" }) {
      const loc = I18N.normalizeLocale(locale);
      const humanRe = I18N.HUMAN_BY_LOCALE[loc] || I18N.HUMAN_BY_LOCALE.en;
      const askedForHuman = humanRe.test(String(hearsHumanRequest || ""));
      if (askedForHuman) return { escalate: true, reason: "lead asked for a human" };
      if (!goodLead && maxAttemptsOfRejection >= 2) return { escalate: true, reason: "AI exhausted options" };
      return { escalate: false, reason: "" };
    }
    function learn(learning, { goodLead, strategies, missed, goodConversation, friendlyKeys }) {
      const next = {
        calls: (learning.calls || 0) + 1,
        strategyScores: { ...learning.strategyScores || {} },
        techniqueScores: { ...learning.techniqueScores || {} },
        customIntent: { ...learning.customIntent || {} },
        unhandled: Array.isArray(learning.unhandled) ? learning.unhandled.slice() : []
      };
      next.techniqueScores.charm_flow = Math.round(Math.max(0, (next.techniqueScores.charm_flow || 0) + (goodLead ? 1 : -0.2)) * 100) / 100;
      for (const k of strategies || []) {
        next.strategyScores[k] = Math.round(((next.strategyScores[k] || 0) + (goodLead ? 1 : -0.15)) * 100) / 100;
      }
      for (const m of missed || []) {
        const keep = next.unhandled.filter((u) => Date.now() - u.at < 1e3 * 60 * 60 * 24 * 7);
        const seen = keep.filter((u) => u.sig === m.sig).length;
        keep.push(m);
        next.unhandled = keep;
        if (seen >= 1) {
          const ci = next.customIntent[m.sig] || { answer: I18N.pick(I18N.FRIENDLY_BY_LOCALE.en, m.sig.length + 3), good: 0, used: 0 };
          ci.used += 0;
          ci.good += goodConversation ? 1 : 0;
          next.customIntent[m.sig] = ci;
        } else if (next.customIntent[m.sig]) {
          const ci = next.customIntent[m.sig];
          ci.used += goodConversation ? 1 : 0;
          ci.good += goodConversation && goodLead ? 1 : 0;
          next.customIntent[m.sig] = ci;
        }
      }
      for (const sig of new Set(friendlyKeys || [])) {
        const ci = next.customIntent[sig];
        if (!ci) continue;
        ci.used += 1;
        ci.good += goodConversation ? 1 : 0;
        if (ci.used >= 3 && ci.good / ci.used < 0.4) delete next.customIntent[sig];
      }
      return next;
    }
    function topStrategy2(learning) {
      const ss = learning && learning.strategyScores || {};
      let best = null;
      let hv = -Infinity;
      for (const k in STRATEGY_INFO) {
        if (ss[k] > hv) {
          hv = ss[k];
          best = k;
        }
      }
      if (!best || hv <= 0) return null;
      const info = STRATEGY_INFO[best];
      return { key: best, name: info.name, source: info.source, score: hv };
    }
    module2.exports = { makeBrain, scoreLead, shouldEscalate, learn, friendlyName, topStrategy: topStrategy2, STRATEGY_INFO };
  }
});

// agent/voice.js
var require_voice = __commonJS({
  "agent/voice.js"(exports2, module2) {
    "use strict";
    var { spawnSync } = require("node:child_process");
    var http = require("node:http");
    var fs2 = require("node:fs");
    var os2 = require("node:os");
    var path2 = require("node:path");
    var TMP = path2.join(os2.tmpdir(), "autodial-voice");
    if (!fs2.existsSync(TMP)) fs2.mkdirSync(TMP, { recursive: true });
    var NEURAL_VOICES = {
      en: "en-US-JennyNeural",
      "en-us": "en-US-JennyNeural",
      "en-gb": "en-GB-SoniaNeural",
      "en-au": "en-AU-NatashaNeural",
      "en-ca": "en-CA-ClaraNeural",
      "en-in": "en-IN-NeerjaNeural",
      ar: "ar-SA-ZariyahNeural",
      zh: "zh-CN-XiaoxiaoNeural",
      "zh-cn": "zh-CN-XiaoxiaoNeural",
      "zh-tw": "zh-TW-HsiaoChenNeural",
      cs: "cs-CZ-VlastaNeural",
      da: "da-DK-ChristelNeural",
      nl: "nl-NL-ColetteNeural",
      fi: "fi-FI-SelmaNeural",
      fr: "fr-FR-DeniseNeural",
      de: "de-DE-KatjaNeural",
      el: "el-GR-AthinaNeural",
      he: "he-IL-HilaNeural",
      hi: "hi-IN-SwaraNeural",
      hu: "hu-HU-NoemiNeural",
      id: "id-ID-GadisNeural",
      it: "it-IT-ElsaNeural",
      ja: "ja-JP-NanamiNeural",
      ko: "ko-KR-SunHiNeural",
      ms: "ms-MY-YasminNeural",
      nb: "nb-NO-PernilleNeural",
      pl: "pl-PL-ZofiaNeural",
      pt: "pt-BR-FranciscaNeural",
      "pt-br": "pt-BR-FranciscaNeural",
      "pt-pt": "pt-PT-RaquelNeural",
      ro: "ro-RO-AlinaNeural",
      ru: "ru-RU-SvetlanaNeural",
      sk: "sk-SK-ViktoriaNeural",
      sl: "sl-SI-PetraNeural",
      es: "es-ES-ElviraNeural",
      "es-mx": "es-MX-DaliaNeural",
      "es-es": "es-ES-ElviraNeural",
      sv: "sv-SE-SofieNeural",
      th: "th-TH-PremwadeeNeural",
      tr: "tr-TR-EmelNeural",
      uk: "uk-UA-PolinaNeural",
      vi: "vi-VN-HoaiMyNeural"
    };
    function edgeVoiceFor(locale) {
      if (NEURAL_VOICES[locale]) return NEURAL_VOICES[locale];
      const base = String(locale).split("-")[0];
      return NEURAL_VOICES[base] || "en-US-JennyNeural";
    }
    var FRANK_VOICES = {
      en: "en-US-DavisNeural",
      "en-us": "en-US-DavisNeural",
      "en-gb": "en-GB-RyanNeural",
      "en-au": "en-AU-WilliamNeural",
      "en-ca": "en-CA-LiamNeural",
      "en-in": "en-IN-PrabhatNeural",
      fr: "fr-FR-RemyNeural",
      "fr-fr": "fr-FR-RemyNeural",
      "fr-ca": "fr-CA-AntoineNeural",
      de: "de-DE-ConradNeural",
      es: "es-ES-AlvaroNeural",
      "es-es": "es-ES-AlvaroNeural",
      "es-mx": "es-MX-JorgeNeural",
      pt: "pt-BR-AntonioNeural",
      "pt-br": "pt-BR-AntonioNeural",
      "pt-pt": "pt-PT-DuarteNeural",
      hi: "hi-IN-MadhurNeural",
      ar: "ar-SA-HamedNeural",
      ru: "ru-RU-DmitryNeural",
      tr: "tr-TR-AhmetNeural",
      uk: "uk-UA-OstapNeural",
      it: "it-IT-DiegoNeural",
      pl: "pl-PL-MarekNeural",
      nl: "nl-NL-MaartenNeural",
      ko: "ko-KR-InJoonNeural",
      ja: "ja-JP-KeitaNeural",
      "zh-cn": "zh-CN-YunxiNeural",
      cs: "cs-CZ-AntoninNeural",
      el: "el-GR-NestorasNeural",
      fi: "fi-FI-HarriNeural",
      sv: "sv-SE-MattiasNeural",
      da: "da-DK-JeppeNeural",
      nb: "nb-NO-FinnNeural",
      he: "he-IL-AvriNeural",
      id: "id-ID-ArdiNeural",
      th: "th-TH-NiwatNeural",
      vi: "vi-VN-NamMinhNeural",
      ms: "ms-MY-FaizNeural",
      sk: "sk-SK-LukasNeural",
      sl: "sl-SI-RokNeural",
      ro: "ro-RO-EmilNeural"
    };
    var FRIENDLY_VOICES = {
      en: "en-US-AriaNeural",
      "en-us": "en-US-AriaNeural",
      "en-gb": "en-GB-SoniaNeural",
      "en-au": "en-AU-NatashaNeural",
      "en-ca": "en-CA-ClaraNeural",
      "en-in": "en-IN-NeerjaNeural",
      fr: "fr-FR-DeniseNeural",
      "fr-fr": "fr-FR-DeniseNeural",
      de: "de-DE-KatjaNeural",
      es: "es-ES-ElviraNeural",
      "es-es": "es-ES-ElviraNeural",
      "es-mx": "es-MX-DaliaNeural",
      pt: "pt-BR-FranciscaNeural",
      "pt-br": "pt-BR-FranciscaNeural",
      "pt-pt": "pt-PT-RaquelNeural",
      hi: "hi-IN-SwaraNeural"
    };
    var VALID_STYLES = /* @__PURE__ */ new Set(["human", "frank", "friendly"]);
    function normalizeStyle(style) {
      const s = String(style || "").toLowerCase().trim();
      return VALID_STYLES.has(s) ? s : "human";
    }
    function edgeVoiceFor(locale, style) {
      const raw = String(locale || "en");
      const full = raw.toLowerCase();
      const base = full.split("-")[0];
      const human = NEURAL_VOICES[full] || NEURAL_VOICES[base] || "en-US-JennyNeural";
      const s = normalizeStyle(style);
      const table = s === "frank" ? FRANK_VOICES : s === "friendly" ? FRIENDLY_VOICES : null;
      if (table) {
        const styled = table[full] || table[base];
        if (styled) return styled;
      }
      return human;
    }
    function styleRate(style, rate) {
      const r = Number(rate) || 1;
      if (normalizeStyle(style) === "frank") return Math.min(1.2, r * 1.06);
      return r;
    }
    var PYTHON = null;
    function resolvePython() {
      if (PYTHON) return PYTHON;
      const home = os2.homedir();
      const candidates = [
        process.env.AUTODIAL_PYTHON,
        process.env.PYTHON,
        path2.join(home, "AppData", "Local", "Programs", "Python", "Python312", "python.exe"),
        path2.join(home, "AppData", "Local", "Programs", "Python", "Python313", "python.exe"),
        path2.join(home, "AppData", "Local", "Programs", "Python", "Python311", "python.exe"),
        "C:\\Python312\\python.exe",
        "C:\\Python311\\python.exe",
        "python",
        "py"
      ].filter(Boolean);
      for (const c of candidates) {
        try {
          const t = spawnSync(c, ["--version"], { stdio: "ignore", timeout: 1e4 });
          if (t.status === 0) {
            PYTHON = c;
            return c;
          }
        } catch {
        }
      }
      return null;
    }
    function speakEdge(text, { locale = "en", rate = 1, style = "human" } = {}) {
      if (process.env.AUTODIAL_NO_EDGE_TTS === "1") return false;
      const python = resolvePython();
      if (!python) return false;
      const file = path2.join(TMP, `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mp3`);
      const effRate = styleRate(style, rate);
      const rateArg = effRate === 1 ? "+0%" : `${effRate > 1 ? "+" : ""}${Math.round((effRate - 1) * 60)}%`;
      const voice = edgeVoiceFor(locale, style);
      try {
        const r = spawnSync(
          python,
          ["-m", "edge_tts", "--voice", voice, "--rate", rateArg, "--text", text, "--write-media", file],
          { stdio: "pipe", timeout: 9e4, encoding: "utf8" }
        );
        if (r.status !== 0 || !fs2.existsSync(file) || fs2.statSync(file).size < 100) {
          if (fs2.existsSync(file)) fs2.unlinkSync(file);
          return false;
        }
        return playFile(file);
      } catch {
        if (fs2.existsSync(file)) fs2.unlinkSync(file);
        return false;
      }
    }
    async function speakHeadTTS(text, { locale = "en", rate = 1, style = "human" } = {}) {
      if (process.env.AUTODIAL_NO_HEADTTS === "1") return false;
      const file = path2.join(TMP, `headtts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.wav`);
      try {
        const ok = await synthViaServer(text, file, locale, styleRate(style, rate));
        if (!ok || !fs2.existsSync(file) || fs2.statSync(file).size < 1e3) {
          if (fs2.existsSync(file)) fs2.unlinkSync(file);
          return false;
        }
        return playFile(file);
      } catch {
        if (fs2.existsSync(file)) fs2.unlinkSync(file);
        return false;
      }
    }
    function synthViaServer(text, outFile, locale, rate) {
      return new Promise((resolve) => {
        const data = JSON.stringify({
          input: text,
          voice: "af_bella",
          language: String(locale).split("-")[0] === "fi" ? "fi" : "en-us",
          speed: clamp(rate, 0.5, 2),
          audioEncoding: "wav"
        });
        const req = http.request(
          {
            host: "127.0.0.1",
            port: 8883,
            path: "/v1/synthesize",
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          },
          (res) => {
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              try {
                const j = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                if (j && j.audio) {
                  fs2.writeFileSync(outFile, Buffer.from(j.audio, "base64"));
                  resolve(true);
                  return;
                }
              } catch {
              }
              resolve(false);
            });
          }
        );
        req.on("error", () => resolve(false));
        req.setTimeout(24e4, () => {
          req.destroy();
          resolve(false);
        });
        req.write(data);
        req.end();
      });
    }
    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }
    function speakWindows(text, { rate = 1, volume = 100 } = {}) {
      const chosen = "Microsoft Zira Desktop";
      const rate10 = Math.round(rate * 10);
      const script = `
    Add-Type -AssemblyName System.Speech
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    foreach($v in $s.GetInstalledVoices()) { if($v.VoiceInfo.Name -eq '${ps(chosen)}') { $s.SelectVoice($v.VoiceInfo.Name); break } }
    $s.Rate = ${rate10}
    $s.Volume = ${Number(volume) || 100}
    $s.Speak('${ps(text)}')
  `;
      const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "ignore", timeout: 6e4 });
      return r.status === 0;
    }
    function ps(v) {
      return v.replace(/'/g, "''");
    }
    function playFile(file) {
      const url = "file:///" + file.replace(/\\/g, "/").replace(/ /g, "%20");
      const script = "Add-Type -AssemblyName PresentationCore;$p = New-Object System.Windows.Media.MediaPlayer;$p.Open([uri]'" + url + "');while(-not $p.NaturalDuration.HasTimeSpan){ Start-Sleep -Milliseconds 50 };$d = [Math]::Max(1.0, $p.NaturalDuration.TimeSpan.TotalSeconds);$p.Play(); Start-Sleep -Milliseconds ([Math]::Min(15000, ($d * 1000) + 350));$p.Stop(); $p.Close()";
      try {
        const r = spawnSync(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-Command", script],
          { stdio: "ignore", timeout: 3e4 }
        );
        return r.status === 0;
      } catch {
        return false;
      }
    }
    async function speak(text, { voice, rate = 1, volume = 100, locale = "en", style = "human" } = {}) {
      if (speakEdge(text, { locale, rate, style })) return { engine: "edge", ok: true };
      if (await speakHeadTTS(text, { locale, rate, style })) return { engine: "headtts", ok: true };
      const ok = speakWindows(text, { rate: styleRate(style, rate), volume });
      return { engine: "windows", ok };
    }
    module2.exports = { speak, speakEdge, speakHeadTTS, speakWindows, edgeVoiceFor, normalizeStyle, styleRate };
  }
});

// agent/hear.js
var require_hear = __commonJS({
  "agent/hear.js"(exports2, module2) {
    "use strict";
    var { spawnSync } = require("node:child_process");
    var WORDS = [
      "yes",
      "yeah",
      "yep",
      "yup",
      "no",
      "nope",
      "nah",
      "maybe",
      "okay",
      "sure",
      "correct",
      "right",
      "wrong",
      "fine",
      "good",
      "great",
      "hello",
      "hi",
      "hey",
      "thanks",
      "thank you",
      "bye",
      "goodbye",
      "good morning",
      "good afternoon",
      "good evening",
      "mhm",
      "uh huh",
      "yes sir",
      "no sir",
      "sounds good",
      "that's fine",
      "start",
      "stop",
      "cancel",
      "repeat",
      "repeat that",
      "help",
      "hold on",
      "one second",
      "just a minute",
      "go ahead",
      "continue",
      "what",
      "what did you say",
      "I don't know",
      "i don't know",
      "not sure",
      "don't know",
      "unknown",
      "n a",
      "n/a",
      "not applicable",
      "none",
      "i don't have it",
      "i don't have that",
      "that's all",
      "that's it",
      "the number",
      "the mc",
      "the phone",
      "my name is",
      "it's",
      "it is",
      "name",
      "number",
      "mc",
      "mc number",
      "phone",
      "phone number",
      "customer",
      "dispatch",
      "trucking",
      "freight",
      "load",
      "truck",
      "driver",
      "carrier",
      "power only",
      "dry van",
      "refrigerated",
      "reefer",
      "flatbed",
      "step deck",
      "box truck",
      "straight truck",
      "semi",
      "trailer",
      "axel",
      "axle",
      "dallas",
      "houston",
      "el paso",
      "laredo",
      "chicago",
      "atlanta",
      "memphis",
      "nashville",
      "indianapolis",
      "kansas city",
      "oklahoma city",
      "denver",
      "phoenix",
      "los angeles",
      "sacramento",
      "portland",
      "seattle",
      "albany",
      "new york",
      "buffalo",
      "cleveland",
      "columbus",
      "cincinnati",
      "detroit",
      "grand rapids",
      "pittsburgh",
      "philadelphia",
      "boston",
      "today",
      "tomorrow",
      "yesterday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "morning",
      "afternoon",
      "evening",
      "night",
      "tonight",
      "this week",
      "next week",
      "this month",
      "next month",
      "as soon as possible",
      "immediately",
      "urgent",
      "open",
      "available",
      "empty",
      "loaded",
      "pickup",
      "delivery",
      "origin",
      "destination",
      "where",
      "when",
      "what time",
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "oh",
      "ten",
      "twenty",
      "thirty",
      "forty",
      "fifty",
      "sixty",
      "seventy",
      "eighty",
      "ninety",
      "hundred",
      "thousand"
    ];
    var PHRASES = [
      "in dallas",
      "in houston",
      "in el paso",
      "in laredo",
      "in chicago",
      "from dallas",
      "from houston",
      "to dallas",
      "to houston",
      "to chicago",
      "twenty four",
      "twenty five",
      "twenty six",
      "twenty seven",
      "twenty eight",
      "twenty nine",
      "thirty one",
      "double zero",
      "double one",
      "zero one",
      "one two three",
      "four five six",
      "seven eight nine",
      "one eight hundred"
    ];
    var WORDS_BY_LOCALE = {
      es: [
        "si",
        "no",
        "okay",
        "claro",
        "correcto",
        "bien",
        "bueno",
        "gracias",
        "hola",
        "oiga",
        "disculpe",
        "buenos dias",
        "muy bien",
        "de acuerdo",
        "no se",
        "no lo se",
        "no entiendo",
        "no me interesa",
        "no quiero",
        "no gracias",
        "estoy ocupado",
        "ocupado",
        "conduciendo",
        "manejando",
        "en la carretera",
        "ya tengo",
        "tengo",
        "mande",
        "diga",
        "un momento",
        "que",
        "como",
        "quien",
        "cuando",
        "donde",
        "cual",
        "a que hora",
        "espere",
        "repita",
        "mire",
        "nombre",
        "numero",
        "telefono",
        "celular",
        "mc",
        "camion",
        "camiones",
        "trailer",
        "carga",
        "flete",
        "fletes",
        "hoy",
        "manana",
        "ayer",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo",
        "esta semana",
        "proxima",
        "semana",
        "dia",
        "casa",
        "cero",
        "uno",
        "dos",
        "tres",
        "cuatro",
        "cinco",
        "seis",
        "siete",
        "ocho",
        "nueve",
        "diez",
        "veinte",
        "treinta",
        "cuarenta",
        "cincuenta",
        "sesenta",
        "setenta",
        "ochenta",
        "noventa",
        "cien"
      ],
      fr: [
        "oui",
        "non",
        "okay",
        "bonjour",
        "bonsoir",
        "merci",
        "d'accord",
        "heuresement",
        "je ne sais pas",
        "je ne comprends pas",
        "pas interesse",
        "je ne veux pas",
        "je suis occupe",
        "occupe",
        "je conduis",
        "sur la route",
        "j'ai deja",
        "deja",
        "mon transitaire",
        "un moment",
        "repetez",
        "comment",
        "pourquoi",
        "quand",
        "ou",
        "qui",
        "quel",
        "a quelle heure",
        "attendez",
        "ecoutez",
        "nom",
        "numero",
        "telephone",
        "portable",
        "mc",
        "camion",
        "remorque",
        "fret",
        "chargement",
        "aujourd'hui",
        "demain",
        "hier",
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi",
        "samedi",
        "dimanche",
        "la semaine prochaine",
        "cette semaine",
        "jour",
        "tres bien",
        "c'est bon",
        "un",
        "deux",
        "trois",
        "quatre",
        "cinq",
        "six",
        "sept",
        "huit",
        "neuf",
        "zero",
        "dix",
        "vingt",
        "trente",
        "quarante",
        "cinquante",
        "soixante",
        "quatre vingt",
        "cent"
      ],
      de: [
        "ja",
        "nein",
        "okay",
        "hallo",
        "guten tag",
        "danke",
        "sehr gut",
        "einverstanden",
        "ich weiss nicht",
        "ich verstehe nicht",
        "nicht interessiert",
        "ich will nicht",
        "ich bin beschaeftigt",
        "beschaeftigt",
        "unterwegs",
        "auf der strasse",
        "ich habe schon",
        "einen moment",
        "wie",
        "warum",
        "wann",
        "wo",
        "wer",
        "welche",
        "um wie viel uhr",
        "warten sie",
        "wiederholen",
        "name",
        "nummer",
        "telefon",
        "handy",
        "mc",
        "lkw",
        "lastwagen",
        "anhaenger",
        "fracht",
        "ladung",
        "transport",
        "heute",
        "morgen",
        "gestern",
        "montag",
        "dienstag",
        "mittwoch",
        "donnerstag",
        "freitag",
        "samstag",
        "sonntag",
        "naechste woche",
        "diese woche",
        "woche",
        "tag",
        "eins",
        "zwei",
        "drei",
        "vier",
        "fuenf",
        "sechs",
        "sieben",
        "acht",
        "neun",
        "null",
        "zehn",
        "zwanzig",
        "dreissig",
        "vierzig",
        "fuenfzig",
        "sechzig",
        "siebzig",
        "achtzig",
        "neunzig",
        "hundert"
      ],
      pt: [
        "sim",
        "nao",
        "okay",
        "claro",
        "certo",
        "bom",
        "bem",
        "obrigado",
        "ola",
        "bom dia",
        "muito bem",
        "de acordo",
        "nao sei",
        "nao entendo",
        "nao quero",
        "nao estou interessado",
        "nao obrigado",
        "estou ocupado",
        "ocupado",
        "dirigindo",
        "na estrada",
        "ja tenho",
        "um momento",
        "o que",
        "como",
        "quando",
        "onde",
        "quem",
        "qual",
        "a que horas",
        "espere",
        "repita",
        "nome",
        "numero",
        "telefone",
        "celular",
        "mc",
        "caminhao",
        "reboque",
        "carga",
        "fretes",
        "hoje",
        "amanha",
        "ontem",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
        "domingo",
        "proxima semana",
        "esta semana",
        "dia",
        "um",
        "dois",
        "tres",
        "quatro",
        "cinco",
        "seis",
        "sete",
        "oito",
        "nove",
        "zero",
        "dez",
        "vinte",
        "trinta",
        "quarenta",
        "cinquenta",
        "sessenta",
        "setenta",
        "oitenta",
        "noventa",
        "cem"
      ],
      hi: [
        "haan",
        "nahin",
        "ji",
        "theek hai",
        "okay",
        "achha",
        "namaste",
        "dhanyavaad",
        "shukriya",
        "main samajha nahin",
        "mujhe nahin chahiye",
        "mujhe nahin",
        "main chala raha hoon",
        "busy hoon",
        "mera nam",
        "mera number",
        "phone number",
        "mc",
        "truck",
        "gaadi",
        "mal",
        "load",
        "aaj",
        "kal",
        "parson",
        "hafata",
        "agla hafta",
        "ek minute",
        "intazaar karo",
        "repete karo",
        "kya",
        "kaise",
        "kab",
        "kahan",
        "kaun",
        "bilkul",
        "ek",
        "do",
        "teen",
        "char",
        "paanch",
        "chhe",
        "saat",
        "aath",
        "nau",
        "shunya",
        "das",
        "bees",
        "tees",
        "chaalees",
        "pachaas",
        "saath",
        "sattar",
        "assi",
        "nabbey",
        "sau"
      ]
    };
    var PHRASES_BY_LOCALE = {
      es: ["buenos dias", "no me interesa", "no lo se", "un momento", "esta semana"],
      fr: ["bonjour monsieur", "pas interesse", "un moment", "cette semaine"],
      de: ["guten tag", "einen moment", "naechste woche"],
      pt: ["bom dia", "nao estou interessado", "um momento", "proxima semana"],
      hi: ["theek hai", "mujhe nahin chahiye", "ek minute"]
    };
    function listenScript({ sec, waveFile, locale = "en" }) {
      const wordsRaw = (WORDS_BY_LOCALE[locale] || WORDS).join(";");
      const phrasesRaw = (PHRASES_BY_LOCALE[locale] || PHRASES).join(";");
      const cultureLine = locale === "en" ? "" : `      $cult = '${CULTURE[locale] || "en-US"}'
      $info = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | Where-Object { $_.Culture.Name -eq $cult } | Select-Object -First 1
`;
      const engineLine = locale === "en" ? `      $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine` : `      if ($info) { $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine($info) } else { $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine }`;
      const input = waveFile ? `$r.SetInputToWaveFile('${waveFile}')` : `$r.SetInputToDefaultAudioDevice()`;
      return `
    Add-Type -AssemblyName System.Speech
    try {
      ${cultureLine}
      ${engineLine}
      ${input}
      $r.InitialSilenceTimeout = New-Object System.TimeSpan(0,0,${sec})
      $r.EndSilenceTimeout = New-Object System.TimeSpan(0,0,2)
      $c = New-Object System.Speech.Recognition.Choices
      $wordsRaw = "${wordsRaw}"
      foreach ($w in ($wordsRaw -split ';')) { if ($w -and $w -ne '') { [void]$c.Add([string]$w) } }
      $phrasesRaw = "${phrasesRaw}"
      foreach ($p in ($phrasesRaw -split ';')) { if ($p -and $p -ne '') { [void]$c.Add([string]$p) } }
      $g = New-Object System.Speech.Recognition.Grammar($c)
      $r.LoadGrammar($g)
      try { $r.UpdateRecognizerSetting('CFGConfidenceThreshold', 0.3) } catch { }
      $res = $r.Recognize()
      if ($res) { Write-Output ('HEARD:' + $res.Text) } else { Write-Output 'HEARD:' }
    } catch {
      Write-Output ('ERR:' + $_.Exception.Message)
    }
  `;
    }
    var CULTURE = { es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", hi: "hi-IN" };
    function hear({ timeoutMs = 6e3, waveFile = null, locale = "en" } = {}) {
      const sec = Math.max(1, Math.round(timeoutMs / 1e3));
      const script = listenScript({ sec, waveFile, locale });
      const r = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs + 2e4 }
      );
      const out = (r.stdout || "").toString().trim();
      const line = out.split(/\r?\n/).find((l) => /^(HEARD|ERR):/.test(l));
      if (!line) return null;
      if (line.startsWith("ERR:")) {
        return null;
      }
      const text = line.slice("HEARD:".length).trim();
      return text === "" ? null : text;
    }
    module2.exports = { hear, WORDS, PHRASES, WORDS_BY_LOCALE, PHRASES_BY_LOCALE };
  }
});

// agent/call-runner.js
var require_call_runner = __commonJS({
  "agent/call-runner.js"(exports2, module2) {
    "use strict";
    var { makeBrain, scoreLead, shouldEscalate, learn } = require_brain();
    var I18N = require_brain_i18n();
    var NAME_BORN = /\b(my name is|this is|it's|thats)\s+([a-z]+)/i;
    var NAME_TOKEN = /\b(hi|hello|hey|yes|yeah|no|sure|okay|ok|fine|thanks|good|great|correct|right)\b/i;
    async function runCall({ product, leadFields, persona, companyName, callbackNumber, callbackIn, speak, listen, contactEmail, learning, locale = "en" }) {
      const requested = I18N.normalizeLocale(locale);
      let loc = requested === "auto" ? "en" : requested;
      let brain = makeBrain({ product, leadFields, persona, companyName, learning, locale: loc });
      const transcript = [];
      const timeline = [];
      const isNegative = (t) => (I18N.NEGATIVE_BY_LOCALE[loc] || I18N.NEGATIVE_BY_LOCALE.en).test(String(t || ""));
      const isSoft = (t) => (I18N.SOFT_BY_LOCALE[loc] || I18N.SOFT_BY_LOCALE.en).test(String(t || ""));
      const retuneFor = (text) => {
        if (requested !== "auto") return;
        const d = I18N.detectLanguage(String(text || "").toLowerCase(), "en");
        if (d !== loc) {
          loc = d;
          brain = makeBrain({ product, leadFields, persona, companyName, learning, locale: loc });
        }
      };
      const think = () => new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 700)));
      let firstLine = true;
      let lastAgentText = "";
      const rawListen = listen;
      const listenForLead = async () => {
        const heard = await rawListen();
        if (!heard || heard.startsWith("(silence)")) return heard;
        const t = String(heard).toLowerCase();
        if (t && lastAgentText.toLowerCase().includes(t)) return null;
        return heard;
      };
      const agent = async (text) => {
        if (firstLine === false) await think();
        lastAgentText = text;
        firstLine = false;
        transcript.push({ role: "agent", text });
        return speak(text);
      };
      const lead = (text) => {
        if (!String(text).startsWith("(silence)")) heardSomething = true;
        transcript.push({ role: "lead", text });
      };
      const finish = (verdict2) => {
        const allLeadWords = transcript.filter((t) => t.role === "lead").map((t) => t.text).filter((t) => !t.startsWith("(silence)")).join(" ");
        const esc2 = shouldEscalate({ goodLead: verdict2.goodLead, maxAttemptsOfRejection: verdict2.maxAttemptsOfRejection, hearsHumanRequest: allLeadWords, locale: loc });
        const goodConversation = verdict2.goodLead || heardSomething === true || transcript.filter((t) => t.role === "lead" && !t.text.startsWith("(silence)")).length >= 2;
        return {
          product,
          company: brain.company,
          transcript,
          timeline,
          score: Number(verdict2.score.toFixed(2)),
          goodLead: verdict2.goodLead,
          escalateToHuman: esc2.escalate,
          escalateReason: esc2.reason,
          learning: learn(learning || {}, { goodLead: verdict2.goodLead, strategies: brain.used, missed: brain.missed, goodConversation, friendlyKeys: brain.usedFriendly }),
          strategies: Array.from(new Set(brain.used)),
          summary: summarize(transcript, verdict2.goodLead, product),
          contactEmail: contactEmail || null
        };
      };
      let rejectionCount = 0;
      let leadName = null;
      let heardSomething = false;
      const captureName = (answer) => {
        const t = String(answer || "").toLowerCase();
        const m = t.match(NAME_BORN);
        if (m) return m[2].charAt(0).toUpperCase() + m[2].slice(1);
        const words = t.replace(/[^a-z ]/g, "").trim().split(/\s+/).filter(Boolean);
        if (words.length === 1 && words[0].length >= 2 && words[0].length <= 12 && !NAME_TOKEN.test(words[0]) && !/not|n a|unknown|none/.test(words[0])) {
          return words[0].charAt(0).toUpperCase() + words[0].slice(1);
        }
        return null;
      };
      const handOff = async () => {
        await agent(brain.handoff());
      };
      await agent(brain.opening(1));
      let reply = await listenForLead();
      if (!reply) {
        await agent(brain.reopenOut());
        reply = await listenForLead();
        if (!reply) {
          lead("(silence)");
          await agent(brain.deadAirClose());
          return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
        }
      }
      lead(reply);
      retuneFor(reply);
      const esc = shouldEscalate({ goodLead: false, maxAttemptsOfRejection: 0, hearsHumanRequest: reply, locale: loc });
      if (esc.escalate) {
        await handOff();
        return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
      }
      if (isNegative(reply)) {
        rejectionCount = 1;
        await agent(brain.pivotSoft(3, reply));
        const second = await listenForLead();
        if (second) {
          lead(second);
          if (isNegative(second)) {
            rejectionCount = 2;
            await agent(brain.pivotGraceful());
            return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
          }
        } else {
          lead("(silence)");
          await agent(brain.pivotGraceful());
          return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
        }
      }
      const answeredDirectly = captureName(reply) !== null || /\b(yes|yeah|yep|ok|okay|sure|alright|fine|good|perfect|thanks|thank you|sounds good|that works|cool|right)\b/i.test(String(reply || "")) && String(reply || "").length < 24;
      if (!isNegative(reply) && !answeredDirectly && !isSoft(reply) && (brain.isQuestion(reply) || String(reply || "").length >= 6)) {
        const line = brain.isQuestion(reply) ? brain.answerQuestion(reply) : brain.friendlyFor(reply);
        if (line) {
          await agent(line);
          const thenReply = await listenForLead();
          if (thenReply && !thenReply.startsWith("(silence)")) {
            lead(thenReply);
            reply = thenReply;
          } else lead("(silence)");
        }
      }
      const wasSoft = !isNegative(reply) && isSoft(reply);
      if (wasSoft) {
        await agent(brain.pivotSoft(3, reply));
        const then = await listenForLead();
        if (then && !then.startsWith("(silence)")) {
          lead(then);
          reply = then;
        } else {
          lead("(silence)");
        }
      }
      await agent(brain.rapport(reply ? 5 : 6));
      const qCount = brain.fields.length;
      for (let asked = 0; asked < qCount; asked++) {
        const field = brain.fields[asked];
        const q = brain.question(field, asked);
        timeline.push(q);
        await agent(q);
        let answer = await listenForLead();
        if (answer && !answer.startsWith("(silence)")) {
          lead(answer);
          if (isNegative(answer)) {
            rejectionCount++;
            if (rejectionCount >= 2) {
              await agent(brain.pivotGraceful());
              return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
            }
            await agent(brain.pivotSoft(asked + 7, answer));
            const again = await listenForLead();
            if (again && !again.startsWith("(silence)")) {
              lead(again);
              if (isNegative(again)) {
                await agent(brain.pivotGraceful());
                return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
              }
              answer = again;
            } else {
              lead("(silence)");
              continue;
            }
          }
          if (String(field).toLowerCase() === "name") {
            leadName = captureName(answer) || leadName;
          }
          await agent(brain.ackFor(answer, asked + 11));
        } else {
          lead("(silence)");
          const retry = brain.retryQuestion(field);
          timeline.push(retry);
          await agent(retry);
          const second = await listenForLead();
          if (second && !second.startsWith("(silence)")) {
            lead(second);
            if (isNegative(second)) {
              rejectionCount++;
              if (rejectionCount >= 2) {
                await agent(brain.pivotGraceful());
                return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
              }
            }
            if (String(field).toLowerCase() === "name") {
              leadName = captureName(second) || leadName;
            }
            await agent(brain.ackFor(second, asked + 13));
          } else {
            lead("(silence)");
          }
        }
      }
      const verdict = scoreLead({ transcript, fields: leadFields, locale: loc });
      const closeOpts = { callbackNumber: callbackNumber || null, callbackIn: callbackIn || null };
      await agent(brain.qualifyingClose(verdict.goodLead, leadName, closeOpts));
      return finish(verdict);
    }
    function summarize(transcript, goodLead, product) {
      const leadLines = transcript.filter((t) => t.role === "lead").map((t) => t.text.replace(/^\((silence)\)$/, "no answer")).filter(Boolean);
      return `Call about ${product}: ${goodLead ? "QUALIFIED LEAD" : "not a lead"}. Lead said: ${leadLines.join(" | ") || "nothing detected"}.`;
    }
    module2.exports = { runCall };
  }
});

// agent/call.js
var require_call = __commonJS({
  "agent/call.js"(exports2, module2) {
    "use strict";
    var { speak } = require_voice();
    var { hear } = require_hear();
    var { runCall } = require_call_runner();
    async function voiceCall({
      product,
      leadFields,
      persona,
      companyName,
      callbackNumber,
      callbackIn,
      contactEmail,
      token,
      portal,
      learning,
      locale = "en",
      voiceStyle = "human",
      onLog = () => {
      },
      onMode = () => {
      },
      speakFn,
      listenFn
    }) {
      const say = speakFn || (async (text) => {
        onMode("speaking");
        onLog("AGENT: " + text);
        return speak(text, { locale, style: voiceStyle });
      });
      const listen = listenFn || (async () => {
        onMode("listening");
        onLog("(listening...)");
        const t = await hear({ timeoutMs: 6e3, locale });
        if (t) onLog("LEAD:  " + t);
        else onLog("(nothing heard)");
        return t;
      });
      onLog("Starting live call\u2026");
      const result = await runCall({ product, leadFields, persona, companyName, callbackNumber, callbackIn, speak: say, listen, contactEmail, learning, locale });
      onLog("Call finished.");
      const updatedLearning = result.learning || learning || {};
      let posted = null;
      if (portal && token) {
        try {
          const res = await fetch(`${portal.replace(/\/+$/, "")}/api/call-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              product,
              transcript: result.transcript,
              score: result.score,
              goodLead: result.goodLead,
              escalateToHuman: result.escalateToHuman,
              strategies: result.strategies || [],
              summary: result.summary
            })
          });
          posted = res.status;
          const body = await res.json().catch(() => ({}));
          onLog(body.emailed ? "Qualified lead email sent \u2713" : "Result reported.");
        } catch (e) {
          onLog(`Could not report result (${e.message}).`);
        }
      }
      return { ...result, posted, learning: updatedLearning };
    }
    module2.exports = { voiceCall };
  }
});

// agent/agent.js
var path = require("node:path");
var fs = require("node:fs");
var os = require("node:os");
var crypto = require("node:crypto");
var { spawn } = require("node:child_process");
var { HEARTBEAT_INTERVAL_MS } = require_protocol();
var { setUi } = require_ui();
var { topStrategy } = require_brain();
var HOSTED_VOIP_SERVERS = {
  ringcentral: "sip.ringcentral.com",
  twilio: "sip-1042-sip.twilio.com",
  vonage: "sip.nexmo.com",
  plivo: "sip.plivo.com",
  thinq: "sip.thinq.com",
  flowroute: "sip.flowroute.com",
  myexotel: "voip.myexotel.com"
};
function defaultConfigPath() {
  const base = process.env.AUTODIAL_HOME ? process.env.AUTODIAL_HOME : path.join(os.homedir(), ".magicdialer");
  return path.join(base, "config.json");
}
function loadConfig(cfgPath = defaultConfigPath()) {
  try {
    return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return null;
  }
}
function saveConfig(config, cfgPath = defaultConfigPath()) {
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), "utf8");
}
function log(msg) {
  console.log(`[agent] ${(/* @__PURE__ */ new Date()).toISOString()} ${msg}`);
}
var WATCHDOG_LOCK = path.join(os.homedir(), "AppData", "Local", "Magic Dialer", "watchdog.lock");
var CRASH_WINDOW_MS = 45e3;
var CRASH_BEFORE_BACKOFF = 3;
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function takeWatchdogLock() {
  try {
    if (fs.existsSync(WATCHDOG_LOCK)) {
      const old = Number(String(fs.readFileSync(WATCHDOG_LOCK, "utf8")).trim());
      if (old && (process.platform === "win32" ? old !== process.pid && pidAlive(old) : pidAlive(old))) {
        console.log(`[watchdog] another supervisor (pid ${old}) is already running \u2014 exiting.`);
        return false;
      }
    }
    fs.mkdirSync(path.dirname(WATCHDOG_LOCK), { recursive: true });
    fs.writeFileSync(WATCHDOG_LOCK, String(process.pid));
    return true;
  } catch {
    return true;
  }
}
async function runWatchdog(args) {
  if (!takeWatchdogLock()) return;
  const childArgs = args.filter((a) => a !== "--watchdog");
  const childCmd = process.env.MD_WATCHDOG_CHILD ? { cmd: "cmd.exe", args: ["/d", "/c", process.env.MD_WATCHDOG_CHILD] } : { cmd: process.execPath, args: childArgs };
  let crashes = 0;
  let lastExit = 0;
  const restart = (n) => new Promise((r) => setTimeout(r, n));
  while (true) {
    log(`watchdog starting agent (pid engine: ${childCmd.cmd})...`);
    const child = spawn(childCmd.cmd, childCmd.args, { stdio: ["ignore", "inherit", "inherit"] });
    const exited = await new Promise((resolve) => {
      child.on("exit", (code) => resolve({ code, ranFor: Date.now() - (child._start || Date.now()) }));
      child._start = Date.now();
    });
    const cfgDir = path.join(os.homedir(), "AppData", "Local", "Magic Dialer");
    let disabled = false;
    try {
      const st = JSON.parse(fs.readFileSync(path.join(cfgDir, "status.json"), "utf8"));
      disabled = st && (st.status === "DISABLED" || st.mode === "off");
    } catch {
    }
    if (disabled) {
      log(`agent left status DISABLED \u2014 supervisor standing down.`);
      return;
    }
    const wasCrash = exited.code !== 0 || exited.ranFor < CRASH_WINDOW_MS;
    const crashy = wasCrash && Date.now() - lastExit < CRASH_WINDOW_MS;
    crashes = wasCrash && crashy ? Math.min(crashes + 1, 10) : wasCrash ? 1 : 0;
    lastExit = Date.now();
    if (wasCrash && crashes >= CRASH_BEFORE_BACKOFF) {
      const backoff = Math.min(1e3 * crashes, 3e5);
      log(`agent exited ${exited.code} after ${exited.ranFor}ms \u2014 crash streak ${crashes}, backing off ${backoff}ms.`);
      await restart(backoff);
    } else if (exited.ranFor >= CRASH_WINDOW_MS) {
      log(`agent exited cleanly (code ${exited.code}) after ${exited.ranFor}ms \u2014 restarting in 4s.`);
      await restart(4e3);
    } else {
      crashes = wasCrash && crashy ? crashes + 1 : Math.max(0, crashes - 1);
      log(`agent exited early (code ${exited.code}) \u2014 restarting in ${wasCrash ? 4e3 : 2e3}ms.`);
      await restart(wasCrash ? 4e3 : 2e3);
    }
  }
}
var VERSION = "1.1.0";
function applyPortalConfig(config, portalCfg, cfgPath) {
  if (!portalCfg || typeof portalCfg !== "object") return false;
  let changed = false;
  const set = (key, v) => {
    const jv = JSON.stringify(v);
    if (jv !== JSON.stringify(config[key])) {
      config[key] = v;
      changed = true;
    }
  };
  if (typeof portalCfg.product === "string" && portalCfg.product.trim()) set("product", portalCfg.product.trim());
  if (Array.isArray(portalCfg.leadFields) && portalCfg.leadFields.length) set("leadFields", portalCfg.leadFields.map((s) => String(s).trim()).filter(Boolean));
  if (typeof portalCfg.contactEmail === "string" && portalCfg.contactEmail.trim()) set("contactEmail", portalCfg.contactEmail.trim());
  if (typeof portalCfg.persona === "string" && portalCfg.persona.trim()) set("persona", portalCfg.persona.trim());
  if (typeof portalCfg.companyName === "string" && portalCfg.companyName.trim()) set("companyName", portalCfg.companyName.trim());
  if (typeof portalCfg.callbackNumber === "string" && portalCfg.callbackNumber.trim()) set("callbackNumber", portalCfg.callbackNumber.trim());
  if (typeof portalCfg.callbackIn === "string" && portalCfg.callbackIn.trim()) set("callbackIn", portalCfg.callbackIn.trim());
  if (Array.isArray(portalCfg.callList)) set("callList", portalCfg.callList.map((n) => String(n).trim()).filter(Boolean));
  if (typeof portalCfg.searchEnabled === "boolean") set("searchEnabled", portalCfg.searchEnabled);
  if (typeof portalCfg.lang === "string" && /^(en|es|fr|de|pt|hi|auto)$/.test(portalCfg.lang.trim())) set("lang", portalCfg.lang.trim());
  if (typeof portalCfg.voiceStyle === "string" && /^(human|frank|friendly)$/.test(portalCfg.voiceStyle.trim())) set("voiceStyle", portalCfg.voiceStyle.trim());
  if (portalCfg.voip && typeof portalCfg.voip === "object" && portalCfg.voip.number && portalCfg.voip.username) {
    const prior = config.voip || {};
    const provider = portalCfg.voip.provider || prior.provider || "";
    const defaultServer = HOSTED_VOIP_SERVERS[provider] || HOSTED_VOIP_SERVERS[prior.provider] || "";
    const next = {
      provider,
      number: portalCfg.voip.number,
      extension: portalCfg.voip.extension || "",
      username: portalCfg.voip.username,
      sipPassword: portalCfg.voip.sipPassword || "",
      server: portalCfg.voip.server || prior.server || defaultServer,
      port: portalCfg.voip.port || prior.port || "",
      transport: portalCfg.voip.transport || prior.transport || "",
      ready: true
    };
    if (JSON.stringify(next) !== JSON.stringify(prior)) {
      config.voip = next;
      changed = true;
      pushActivity(config, `VOIP line applied (${next.provider}, ${next.number}) - outbound calls use it.`);
    }
  }
  if (changed) {
    saveConfig(config, cfgPath);
    pushActivity(config, "Admin updated the sales form from the portal - applied.");
    console.log(`[agent] applied portal config: ${JSON.stringify({
      product: config.product,
      leadFields: config.leadFields || [],
      companyName: config.companyName || null,
      callbackNumber: config.callbackNumber || null,
      callbackIn: config.callbackIn || null,
      callList: (config.callList || []).length,
      searchEnabled: config.searchEnabled,
      lang: config.lang
    })}`);
  }
  return changed;
}
function bumpStats(config, result) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const s = config.stats || { since: day, day, calls: 0, qualified: 0, today: 0, qualifiedToday: 0, lastScore: 0, bestScore: 0, qualifiedRate: 0 };
  if (s.day !== day) {
    s.day = day;
    s.today = 0;
    s.qualifiedToday = 0;
  }
  s.calls++;
  s.today++;
  if (result.goodLead) {
    s.qualified++;
    s.qualifiedToday++;
  }
  s.lastScore = result.score;
  if (result.score > (s.bestScore || 0)) s.bestScore = result.score;
  s.qualifiedRate = Math.round(100 * s.qualified / Math.max(1, s.calls)) / 100;
  config.stats = s;
  return s;
}
function pushActivity(config, msg) {
  const feed = (config.activity || []).slice(0, 29);
  feed.unshift({ at: (/* @__PURE__ */ new Date()).toISOString(), msg });
  config.activity = feed;
  return feed;
}
function post(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
}
function showCockpit(configDir) {
  const isPacked = path.basename(process.execPath).toLowerCase().includes("magicdialer");
  if (!isPacked) return;
  if (process.env.MAGICDIALER_NO_COCKPIT === "1") return;
  try {
    spawn("powershell.exe", [
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-Command",
      `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class HC{[DllImport("kernel32.dll")]public static extern IntPtr GetConsoleWindow();[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);}';[HC]::ShowWindow([HC]::GetConsoleWindow(),0)`
    ], { stdio: "ignore" });
    const cockpit = path.join(path.dirname(process.execPath), "cockpit.ps1");
    if (fs.existsSync(cockpit)) {
      spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", cockpit], { stdio: "ignore" });
    }
  } catch {
  }
}
var { createInterface } = require("node:readline");
function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + " ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
async function runAgent(opts = {}) {
  const cfgPath = opts.configPath || defaultConfigPath();
  let config = loadConfig(cfgPath);
  if (!config || !config.token) {
    log("No config yet \u2014 starting setup.");
    config = config || {};
    config.machineId = config.machineId || crypto.randomUUID();
    config.lang = config.lang || "en";
    config.voiceStyle = config.voiceStyle || "human";
    config.portalUrl = opts.portalUrl || await ask("Magic Dialer portal URL (from your admin):");
    config.token = opts.token || await ask("Your Magic Dialer access token (from your admin):");
    saveConfig(config, cfgPath);
    log("Config saved.");
  }
  if (opts.setup === true) {
    log("");
    log("============================================================");
    log("                 MAGIC DIALER \u2014 1-minute setup");
    log("============================================================");
    log("");
    config.product = await ask("What do you sell / what services do you provide?");
    config.leadFieldsRaw = await ask("What do you need from a qualified lead (comma-separated)?");
    config.contactEmail = await ask("Where should qualified leads be emailed?");
    config.leadFields = config.leadFieldsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    log("Optional: your phone/VOIP line (press Enter on each to skip and configure later)");
    config.voip = config.voip || {};
    config.voip.provider = (await ask("VOIP/SIP provider (e.g. Twilio, Asterisk)? (Enter = none yet):")).trim() || config.voip.provider || "";
    config.voip.number = (await ask("Your outbound phone number? (Enter = none yet):")).trim() || config.voip.number || "";
    config.voip.username = (await ask("SIP username/account? (Enter = none yet):")).trim() || config.voip.username || "";
    config.voip.server = (await ask("SIP domain/server (e.g. sip.example.com)? (Enter = none yet):")).trim() || config.voip.server || "";
    if (!config.voip.provider && !config.voip.number && !config.voip.username && !config.voip.server) {
      config.voip.ready = false;
    } else {
      config.voip.ready = true;
    }
    saveConfig(config, cfgPath);
    log("Setup complete. Your Magic Dialer agent is now running.");
    log("The portal will show this PC as ONLINE. Right now the agent makes voice");
    log("calls through this PC's microphone + speakers (a full phone line needs a provider).");
  }
  const configDir = path.dirname(cfgPath);
  showCockpit(configDir);
  const productLabel = config.product || "Magic Dialer customer";
  const ui = (patch) => setUi(configDir, {
    version: VERSION,
    agent: (config.persona || "autumn").toLowerCase().includes("female") ? "Autumn" : "Atlas",
    company: config.companyName || "our team",
    product: productLabel,
    machineId: config.machineId,
    stats: config.stats || null,
    strategy: config.learning ? topStrategy(config.learning) : null,
    callListCount: Array.isArray(config.callList) ? config.callList.length : 0,
    logs: (config.activity || []).slice(0, 12),
    ...patch
  });
  ui({ status: "STARTING", mode: "idle", line: "Starting Magic Dialer agent..." });
  const portal = config.portalUrl.replace(/\/+$/, "");
  if (opts.call === true) {
    const { voiceCall } = require_call();
    try {
      const result = await voiceCall({
        product: config.product,
        leadFields: config.leadFields || [],
        persona: config.persona,
        companyName: config.companyName,
        callbackNumber: config.callbackNumber,
        callbackIn: config.callbackIn,
        contactEmail: config.contactEmail,
        token: config.token,
        portal,
        learning: config.learning,
        locale: config.lang || "en",
        voiceStyle: config.voiceStyle || "human",
        onLog: (m) => {
          log(m);
          ui({ line: m });
        },
        onMode: (m) => ui({ mode: m })
      });
      config.learning = result.learning;
      bumpStats(config, result);
      pushActivity(config, `Call done - score ${result.score}, ${result.goodLead ? "QUALIFIED LEAD" : "no lead"}. Strategy: ${(result.strategies || []).slice(0, 3).join(", ") || "intro"}${result.goodLead ? ". EMAILED to " + (config.contactEmail || "the portal") : ""}`);
      saveConfig(config, cfgPath);
      const finalLine = `Call result - score ${result.score}, ${result.goodLead ? "QUALIFIED LEAD" : "no lead"}.`;
      log(finalLine);
      ui({ mode: "idle", line: finalLine });
    } catch (e) {
      log("Voice call failed: " + e.message);
      ui({ mode: "idle", line: "Voice call failed - retrying later." });
    }
    if (opts.callOnce === true) {
      log("Test call finished. Exiting (heartbeat stays with the main agent).");
      return;
    }
  }
  while (true) {
    try {
      const res = await post(`${portal}/api/heartbeat`, { token: config.token, voipReady: !!(config.voip && config.voip.ready) });
      if (res.status === 200 && res.body) {
        if (res.body.disabled) {
          log("DISABLED by admin - stopping work. This PC will not run again until re-enabled.");
          ui({ status: "DISABLED", mode: "off", line: "Disabled by admin." });
          process.exit(0);
        }
        applyPortalConfig(config, res.body.config, cfgPath);
        const hl = `heartbeat OK (${res.body.config ? res.body.config.product || "customer" : "customer"})`;
        log(hl);
        ui({ status: "ONLINE", line: hl });
      } else {
        log(`heartbeat rejected (status ${res.status}) - not a registered customer.`);
        ui({ status: "OFFLINE", line: "Heartbeat rejected - check your access key." });
      }
    } catch (err) {
      log(`heartbeat failed (${err.code || err.message}) - retrying.`);
      ui({ status: "OFFLINE", line: "Reconnecting to portal..." });
    }
    await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS));
  }
}
module.exports = { runAgent, loadConfig, saveConfig, defaultConfigPath, applyPortalConfig, bumpStats, pushActivity };
if (require.main === module) {
  const argv = process.argv.slice(2);
  const setup = argv.includes("--setup");
  const call = argv.includes("--call") || argv.includes("--call-once");
  const callOnce = argv.includes("--call-once");
  const rest = argv.filter((a) => a !== "--setup" && a !== "--call" && a !== "--call-once");
  if (argv.includes("--watchdog")) {
    runWatchdog(rest).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    runAgent({ token: rest[0], portalUrl: rest[1], setup, call, callOnce }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}
