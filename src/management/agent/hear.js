const { spawnSync } = require("node:child_process");

/**
 * "Hearing" for the agent. Uses Windows' built-in English (US) recognizer.
 *
 * IMPORTANT (Windows 11): SAPI's DictationGrammar was removed on modern
 * Windows — it returns null no matter what. We therefore use a command
 * grammar (Grammar + Choices) with a broad word list instead.
 *
 * Honest limits: it only hears words in the list below (plus digit strings).
 * Anything else comes back as null and the caller re-asks. Numbers (MC,
 * phone) work because users naturally say digits one at a time.
 */

// Words the agent listens for. One word per array entry (ASCII only —
// PowerShell 5.1 mangles non-ASCII here-strings).
const WORDS = [
  "yes", "yeah", "yep", "yup", "no", "nope", "nah", "maybe", "okay", "sure",
  "correct", "right", "wrong", "fine", "good", "great", "hello", "hi", "hey",
  "thanks", "thank you", "bye", "goodbye", "good morning", "good afternoon",
  "good evening", "mhm", "uh huh", "yes sir", "no sir", "sounds good",
  "that's fine", "start", "stop", "cancel", "repeat", "repeat that",
  "help", "hold on", "one second", "just a minute", "go ahead", "continue",
  "what", "what did you say", "I don't know", "i don't know", "not sure",
  "don't know", "unknown", "n a", "n/a", "not applicable", "none",
  "i don't have it", "i don't have that", "that's all", "that's it",
  "the number", "the mc", "the phone", "my name is", "it's", "it is",
  "name", "number", "mc", "mc number", "phone", "phone number", "customer",
  "dispatch", "trucking", "freight", "load", "truck", "driver", "carrier",
  "power only", "dry van", "refrigerated", "reefer", "flatbed", "step deck",
  "box truck", "straight truck", "semi", "trailer", "axel", "axle",
  "dallas", "houston", "el paso", "laredo", "chicago", "atlanta",
  "memphis", "nashville", "indianapolis", "kansas city", "oklahoma city",
  "denver", "phoenix", "los angeles", "sacramento", "portland", "seattle",
  "albany", "new york", "buffalo", "cleveland", "columbus", "cincinnati",
  "detroit", "grand rapids", "pittsburgh", "philadelphia", "boston",
  "today", "tomorrow", "yesterday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday", "sunday",
  "morning", "afternoon", "evening", "night", "tonight",
  "this week", "next week", "this month", "next month", "as soon as possible",
  "immediately", "urgent", "open", "available", "empty", "loaded", "pickup",
  "delivery", "origin", "destination", "where", "when", "what time",
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "oh", "ten", "twenty", "thirty", "forty", "fifty", "sixty",
  "seventy", "eighty", "ninety", "hundred", "thousand",
];

// Pairs of words the recognizer should hear together commonly.
const PHRASES = [
  "in dallas", "in houston", "in el paso", "in laredo", "in chicago",
  "from dallas", "from houston", "to dallas", "to houston", "to chicago",
  "twenty four", "twenty five", "twenty six", "twenty seven", "twenty eight",
  "twenty nine", "thirty one", "double zero", "double one", "zero one",
  "one two three", "four five six", "seven eight nine", "one eight hundred",
];

// Per-locale listening (ASCII-only: PowerShell 5.1 mangles non-ASCII
// here-strings, and the recognizer returns ASCII/transliterated text).
// `hear()` picks the engine culture (es-ES/fr-FR/de-DE/pt-BR/hi-IN) when a
// language pack is installed, else falls back to the English engine with the
// localized word list — best-effort but far better than English-only.
const WORDS_BY_LOCALE = {
  es: [
    "si", "no", "okay", "claro", "correcto", "bien", "bueno", "gracias", "hola",
    "oiga", "disculpe", "buenos dias", "muy bien", "de acuerdo", "no se",
    "no lo se", "no entiendo", "no me interesa", "no quiero", "no gracias",
    "estoy ocupado", "ocupado", "conduciendo", "manejando", "en la carretera",
    "ya tengo", "tengo", "mande", "diga", "un momento", "que", "como", "quien",
    "cuando", "donde", "cual", "a que hora", "espere", "repita", "mire",
    "nombre", "numero", "telefono", "celular", "mc", "camion", "camiones",
    "trailer", "carga", "flete", "fletes", "hoy", "manana", "ayer", "lunes",
    "martes", "miercoles", "jueves", "viernes", "sabado", "domingo",
    "esta semana", "proxima", "semana", "dia", "casa",
    "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
    "nueve", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta",
    "setenta", "ochenta", "noventa", "cien",
  ],
  fr: [
    "oui", "non", "okay", "bonjour", "bonsoir", "merci", "d'accord", "heuresement",
    "je ne sais pas", "je ne comprends pas", "pas interesse", "je ne veux pas",
    "je suis occupe", "occupe", "je conduis", "sur la route", "j'ai deja", "deja",
    "mon transitaire", "un moment", "repetez", "comment", "pourquoi", "quand",
    "ou", "qui", "quel", "a quelle heure", "attendez", "ecoutez", "nom",
    "numero", "telephone", "portable", "mc", "camion", "remorque", "fret",
    "chargement", "aujourd'hui", "demain", "hier", "lundi", "mardi",
    "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "la semaine prochaine",
    "cette semaine", "jour", "tres bien", "c'est bon",
    "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "zero", "dix", "vingt", "trente", "quarante", "cinquante", "soixante",
    "quatre vingt", "cent",
  ],
  de: [
    "ja", "nein", "okay", "hallo", "guten tag", "danke", "sehr gut",
    "einverstanden", "ich weiss nicht", "ich verstehe nicht", "nicht interessiert",
    "ich will nicht", "ich bin beschaeftigt", "beschaeftigt", "unterwegs",
    "auf der strasse", "ich habe schon", "einen moment", "wie", "warum",
    "wann", "wo", "wer", "welche", "um wie viel uhr", "warten sie",
    "wiederholen", "name", "nummer", "telefon", "handy", "mc", "lkw",
    "lastwagen", "anhaenger", "fracht", "ladung", "transport", "heute",
    "morgen", "gestern", "montag", "dienstag", "mittwoch", "donnerstag",
    "freitag", "samstag", "sonntag", "naechste woche", "diese woche", "woche", "tag",
    "eins", "zwei", "drei", "vier", "fuenf", "sechs", "sieben", "acht", "neun",
    "null", "zehn", "zwanzig", "dreissig", "vierzig", "fuenfzig", "sechzig",
    "siebzig", "achtzig", "neunzig", "hundert",
  ],
  pt: [
    "sim", "nao", "okay", "claro", "certo", "bom", "bem", "obrigado", "ola",
    "bom dia", "muito bem", "de acordo", "nao sei", "nao entendo", "nao quero",
    "nao estou interessado", "nao obrigado", "estou ocupado", "ocupado",
    "dirigindo", "na estrada", "ja tenho", "um momento", "o que", "como",
    "quando", "onde", "quem", "qual", "a que horas", "espere", "repita",
    "nome", "numero", "telefone", "celular", "mc", "caminhao", "reboque",
    "carga", "fretes", "hoje", "amanha", "ontem", "segunda", "terca", "quarta",
    "quinta", "sexta", "sabado", "domingo", "proxima semana", "esta semana", "dia",
    "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "zero", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta",
    "setenta", "oitenta", "noventa", "cem",
  ],
  hi: [
    "haan", "nahin", "ji", "theek hai", "okay", "achha", "namaste",
    "dhanyavaad", "shukriya", "main samajha nahin", "mujhe nahin chahiye",
    "mujhe nahin", "main chala raha hoon", "busy hoon", "mera nam", "mera number",
    "phone number", "mc", "truck", "gaadi", "mal", "load", "aaj", "kal",
    "parson", "hafata", "agla hafta", "ek minute", "intazaar karo",
    "repete karo", "kya", "kaise", "kab", "kahan", "kaun", "bilkul",
    "ek", "do", "teen", "char", "paanch", "chhe", "saat", "aath", "nau",
    "shunya", "das", "bees", "tees", "chaalees", "pachaas", "saath",
    "sattar", "assi", "nabbey", "sau",
  ],
};

const PHRASES_BY_LOCALE = {
  es: ["buenos dias", "no me interesa", "no lo se", "un momento", "esta semana"],
  fr: ["bonjour monsieur", "pas interesse", "un moment", "cette semaine"],
  de: ["guten tag", "einen moment", "naechste woche"],
  pt: ["bom dia", "nao estou interessado", "um momento", "proxima semana"],
  hi: ["theek hai", "mujhe nahin chahiye", "ek minute"],
};

function listenScript({ sec, waveFile, locale = "en" }) {
  // Inject words as a single ';'-joined ASCII blob; PowerShell splits on ';'.
  // No word contains ';', so this is unambiguous and immune to quoting bugs.
  const wordsRaw = (WORDS_BY_LOCALE[locale] || WORDS).join(";");
  const phrasesRaw = (PHRASES_BY_LOCALE[locale] || PHRASES).join(";");
  const cultureLine =
    locale === "en"
      ? ""
      : `      $cult = '${CULTURE[locale] || "en-US"}'
      $info = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | Where-Object { $_.Culture.Name -eq $cult } | Select-Object -First 1
`;
  const engineLine = locale === "en"
    ? `      $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine`
    : `      if ($info) { $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine($info) } else { $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine }`;
  const input =
    waveFile
      ? `$r.SetInputToWaveFile('${waveFile}')`
      : `$r.SetInputToDefaultAudioDevice()`;
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

const CULTURE = { es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", hi: "hi-IN" };

/**
 * Listen for speech for up to `timeoutMs`. Returns recognized text (trimmed)
 * or null if nothing matched / recognition unavailable.
 *
 * For tests: pass `waveFile` (a .wav path) to transcribe a recording instead
 * of listening to the microphone.
 */
function hear({ timeoutMs = 6000, waveFile = null, locale = "en" } = {}) {
  const sec = Math.max(1, Math.round(timeoutMs / 1000));
  const script = listenScript({ sec, waveFile, locale });
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs + 20000 },
  );
  const out = (r.stdout || "").toString().trim();
  const line = out.split(/\r?\n/).find((l) => /^(HEARD|ERR):/.test(l));
  if (!line) return null;
  if (line.startsWith("ERR:")) {
    // Recognition threw (e.g. no audio device). Same null contract as silence.
    return null;
  }
  const text = line.slice("HEARD:".length).trim();
  return text === "" ? null : text;
}

module.exports = { hear, WORDS, PHRASES, WORDS_BY_LOCALE, PHRASES_BY_LOCALE };