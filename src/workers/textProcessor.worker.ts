/**
 * Web Worker pour le traitement de texte (Nettoyage + Humanisation)
 * Permet de ne pas bloquer le thread principal de l'UI.
 */

self.onmessage = (e: MessageEvent) => {
  const { action, text, options } = e.data;

  if (action === "clean") {
    const result = performClean(text);
    self.postMessage({ action: "clean", result });
  } else if (action === "humanize") {
    const result = performHumanize(text, options.intensity);
    self.postMessage({ action: "humanize", result });
  }
};

function performClean(inputText: string) {
  const nbsp = /\u00A0/g;
  const narrowNbsp = /\u202F/g;
  
  const nbspMatches = inputText.match(nbsp) || [];
  const narrowNbspMatches = inputText.match(narrowNbsp) || [];

  const cleanedText = inputText.replace(nbsp, " ").replace(narrowNbsp, " ");

  return {
    cleanedText,
    stats: {
      nbspCount: nbspMatches.length,
      narrowNbspCount: narrowNbspMatches.length,
      totalCleaned: nbspMatches.length + narrowNbspMatches.length,
    }
  };
}

function performHumanize(inputText: string, intensity: "light" | "moderate" | "aggressive") {
  let result = inputText;
  let modifications = 0;
  const changeLog: Array<{ type: string; original: string; replacement: string; reason: string }> = [];

  // 1. Remplacement de transitions (Exemple simplifié)
  const transitions: [RegExp, string[]][] = [
    [/\bEn effet,/gi, ["D'ailleurs,", "En fait,", "À vrai dire,"]],
    [/\bCependant,/gi, ["Mais bon,", "Toutefois,", "Par contre,"]],
    [/\bDe plus,/gi, ["Aussi,", "Et puis,", "D'un autre côté,"]],
  ];

  transitions.forEach(([regex, replacements]) => {
    result = result.replace(regex, (match) => {
      modifications++;
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      changeLog.push({ type: "transition", original: match, replacement, reason: "Variation de transition" });
      return replacement;
    });
  });

  // 2. Variation Nombres -> Lettres (Exemple)
  const numberMap: Record<string, string> = {
    "1": "un", "2": "deux", "3": "trois", "4": "quatre", "5": "cinq",
    "6": "six", "7": "sept", "8": "huit", "9": "neuf"
  };

  result = result.replace(/\b([1-9])\b/g, (match) => {
    if (Math.random() > 0.5) {
      modifications++;
      const replacement = numberMap[match];
      changeLog.push({ type: "number", original: match, replacement, reason: "Conversion chiffre en lettre" });
      return replacement;
    }
    return match;
  });

  return {
    humanizedText: result,
    modificationsCount: modifications,
    changeLog
  };
}
