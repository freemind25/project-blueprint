import { useState, useCallback } from "react";

interface CleaningResult {
  cleanedText: string;
  nbspCount: number;
  narrowNbspCount: number;
  totalCleaned: number;
}

interface HumanizeResult {
  humanizedText: string;
  modificationsCount: number;
}

export type HumanizeIntensity = "light" | "moderate" | "aggressive";

export const useTextCleaner = () => {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [stats, setStats] = useState<CleaningResult | null>(null);
  const [humanizeStats, setHumanizeStats] = useState<HumanizeResult | null>(null);
  const [humanizeIntensity, setHumanizeIntensity] = useState<HumanizeIntensity>("moderate");

  const loadFile = useCallback((content: string, name: string) => {
    setText(content);
    setFileName(name);
    setIsCleaned(false);
    setIsHumanized(false);
    setStats(null);
    setHumanizeStats(null);
  }, []);

  const cleanText = useCallback((inputText: string): CleaningResult => {
    // U+00A0 - Non-breaking space
    const nbsp = /\u00A0/g;
    // U+202F - Narrow non-breaking space
    const narrowNbsp = /\u202F/g;

    const nbspMatches = inputText.match(nbsp) || [];
    const narrowNbspMatches = inputText.match(narrowNbsp) || [];

    const nbspCount = nbspMatches.length;
    const narrowNbspCount = narrowNbspMatches.length;

    // Replace with normal space
    const cleanedText = inputText.replace(nbsp, " ").replace(narrowNbsp, " ");

    return {
      cleanedText,
      nbspCount,
      narrowNbspCount,
      totalCleaned: nbspCount + narrowNbspCount,
    };
  }, []);

  const performClean = useCallback(() => {
    if (!text) return;

    setIsProcessing(true);
    
    // Simulate processing time for UX
    setTimeout(() => {
      const result = cleanText(text);
      setText(result.cleanedText);
      setStats(result);
      setIsCleaned(true);
      setIsProcessing(false);
    }, 300);
  }, [text, cleanText]);

  // Humanize text to avoid AI detection
  const humanizeText = useCallback((inputText: string, intensity: HumanizeIntensity): HumanizeResult => {
    let result = inputText;
    let modifications = 0;

    // Probability thresholds based on intensity
    const thresholds = {
      light: { base: 0.75, medium: 0.85, high: 0.92, rare: 0.96 },
      moderate: { base: 0.5, medium: 0.6, high: 0.85, rare: 0.9 },
      aggressive: { base: 0.25, medium: 0.35, high: 0.6, rare: 0.75 },
    };
    const t = thresholds[intensity];

    // 1. Expressions de transition à varier (plus complètes)
    const transitionReplacements: [RegExp, string[]][] = [
      [/\bEn effet,/gi, ["D'ailleurs,", "En fait,", "À vrai dire,", "Bon,"]],
      [/\bCependant,/gi, ["Mais bon,", "Toutefois,", "Par contre,", "Après,"]],
      [/\bPar conséquent,/gi, ["Du coup,", "Donc,", "Résultat :", "Et donc,"]],
      [/\bDe plus,/gi, ["En plus de ça,", "Aussi,", "Et puis,", "Sans compter que"]],
      [/\bNéanmoins,/gi, ["Quand même,", "Malgré tout,", "Cela dit,", "Bon après,"]],
      [/\bAinsi,/gi, ["Comme ça,", "De cette façon,", "C'est ainsi que", "Voilà comment"]],
      [/\bFinalement,/gi, ["Au final,", "En fin de compte,", "Pour finir,", "Bref,"]],
      [/\bToutefois,/gi, ["Cela dit,", "Mais bon,", "Quand même,", "Après,"]],
      [/\bEn outre,/gi, ["Et aussi,", "En plus,", "D'autant que,", "Sans oublier que"]],
      [/\bPar ailleurs,/gi, ["D'un autre côté,", "Sinon,", "Autrement,", "À part ça,"]],
      [/\bEn premier lieu,/gi, ["D'abord,", "Pour commencer,", "Déjà,", "Premièrement,"]],
      [/\bEn second lieu,/gi, ["Ensuite,", "Après,", "Puis,", "Et puis,"]],
      [/\bIl convient de noter que/gi, ["À noter que", "Faut savoir que", "Important :", "D'ailleurs,"]],
      [/\bIl est important de souligner que/gi, ["Faut quand même dire que", "Ce qui est important c'est que", "À souligner :"]],
      [/\bDans le cadre de/gi, ["Pour", "Concernant", "Au niveau de", "En ce qui concerne"]],
      [/\bAfin de/gi, ["Pour", "Histoire de", "Dans le but de"]],
      [/\bEn ce qui concerne/gi, ["Pour ce qui est de", "Côté", "Question", "Sur"]],
    ];

    // 1b. English transition replacements (so it works on English text too)
    const englishTransitionReplacements: [RegExp, string[]][] = [
      [/\bFurthermore,/gi, ["On top of that,", "Plus,", "And also,", "Besides,"]],
      [/\bMoreover,/gi, ["What's more,", "On top of that,", "Also,", "Plus,"]],
      [/\bHowever,/gi, ["But,", "Still,", "That said,", "Then again,"]],
      [/\bTherefore,/gi, ["So,", "That's why", "Which means", "As a result,"]],
      [/\bConsequently,/gi, ["So,", "As a result,", "Because of that,"]],
      [/\bIn addition,/gi, ["Also,", "On top of that,", "Plus,", "And,"]],
      [/\bNevertheless,/gi, ["Even so,", "Still,", "That said,", "Anyway,"]],
      [/\bNonetheless,/gi, ["Still,", "Even so,", "Anyway,"]],
      [/\bAdditionally,/gi, ["Also,", "Plus,", "And,", "On top of that,"]],
      [/\bThus,/gi, ["So,", "That way,", "Which is why"]],
      [/\bHence,/gi, ["So,", "That's why", "Which is why"]],
      [/\bIn conclusion,/gi, ["To wrap up,", "All in all,", "In short,", "So,"]],
      [/\bIn summary,/gi, ["In short,", "To sum up,", "Basically,"]],
      [/\bIt is important to note that/gi, ["Worth noting:", "Keep in mind that", "Note that", "Just so you know,"]],
      [/\bIt is important to consider/gi, ["It helps to think about", "Worth considering", "Keep in mind"]],
      [/\bIt should be noted that/gi, ["Note that", "Worth mentioning:", "Keep in mind that"]],
      [/\bIn order to/gi, ["To", "So as to", "Just to"]],
      [/\bAs a result,/gi, ["So,", "Because of that,", "Which means"]],
      [/\bFirstly,/gi, ["First,", "To start,", "For starters,"]],
      [/\bSecondly,/gi, ["Second,", "Then,", "Next,"]],
      [/\bIn contrast,/gi, ["On the other hand,", "Then again,", "But,"]],
    ];

    // Appliquer les remplacements de transitions (FR + EN)
    [...transitionReplacements, ...englishTransitionReplacements].forEach(([pattern, replacements]) => {
      result = result.replace(pattern, (match) => {
        if (Math.random() > t.base) {
          modifications++;
          return replacements[Math.floor(Math.random() * replacements.length)];
        }
        return match;
      });
    });

    // 2. Varier la longueur des phrases (couper les longues)
    const sentences = result.split(/(?<=[.!?])\s+/);
    const modifiedSentences = sentences.map((sentence) => {
      // Couper les phrases très longues (>150 caractères)
      if (sentence.length > 150 && Math.random() > t.medium) {
        const splitPoints = [", qui ", ", ce qui ", ", car ", ", et ", ", mais "];
        for (const point of splitPoints) {
          if (sentence.includes(point)) {
            modifications++;
            return sentence.replace(point, ". " + point.trim().charAt(2).toUpperCase() + point.trim().slice(3));
          }
        }
      }
      return sentence;
    });
    result = modifiedSentences.join(" ");

    // 3. Ajouter des interjections et expressions naturelles
    const naturalInsertions: [RegExp, string[]][] = [
      [/\. ([A-Z])/g, [". Bon, $1", ". Bref, $1", ". Enfin, $1", ". Voilà, $1", ". $1"]],
      [/\. ([A-Z])/g, [". En gros, $1", ". Genre, $1", ". Disons que $1", ". $1"]],
    ];

    naturalInsertions.forEach(([pattern, replacements]) => {
      let count = 0;
      result = result.replace(pattern, (match, letter) => {
        count++;
        // N'insérer que très occasionnellement
        const freq = intensity === "aggressive" ? 4 : intensity === "moderate" ? 6 : 10;
        if (count % Math.floor(Math.random() * 4 + freq) === 0 && Math.random() > t.medium) {
          modifications++;
          const replacement = replacements[Math.floor(Math.random() * replacements.length)];
          return replacement.replace("$1", letter);
        }
        return match;
      });
    });

    // 4. Remplacer des mots trop formels par des équivalents courants
    const informalReplacements: [RegExp, string[]][] = [
      [/\butiliser\b/gi, ["se servir de", "prendre", "employer"]],
      [/\bpermettre\b/gi, ["laisser", "donner la possibilité de", "aider à"]],
      [/\beffectuer\b/gi, ["faire", "réaliser"]],
      [/\bconstater\b/gi, ["voir", "remarquer", "noter"]],
      [/\bposséder\b/gi, ["avoir", "détenir"]],
      [/\bnécessaire\b/gi, ["important", "utile", "essentiel"]],
      [/\bsignificatif\b/gi, ["important", "notable", "marquant"]],
      [/\bconséquent\b/gi, ["gros", "important", "sérieux"]],
      [/\boptimal\b/gi, ["idéal", "parfait", "top"]],
      [/\bproblématique\b/gi, ["problème", "souci", "difficulté"]],
      [/\bfondamental\b/gi, ["essentiel", "de base", "crucial"]],
      [/\bspécifique\b/gi, ["précis", "particulier", "donné"]],
      [/\bapproprié\b/gi, ["adapté", "bon", "qui convient"]],
      [/\badéquat\b/gi, ["adapté", "bon", "correct"]],
    ];

    // 4b. English formal -> informal word replacements
    const englishInformalReplacements: [RegExp, string[]][] = [
      [/\butilize\b/gi, ["use", "go with"]],
      [/\butilise\b/gi, ["use", "go with"]],
      [/\bfacilitate\b/gi, ["help", "make easier", "ease"]],
      [/\bdemonstrate\b/gi, ["show", "prove"]],
      [/\bnumerous\b/gi, ["many", "a lot of", "lots of"]],
      [/\bsignificant\b/gi, ["big", "major", "notable"]],
      [/\bsubstantial\b/gi, ["big", "large", "sizable"]],
      [/\boptimal\b/gi, ["best", "ideal", "perfect"]],
      [/\bfundamental\b/gi, ["basic", "core", "key"]],
      [/\bspecific\b/gi, ["particular", "exact", "certain"]],
      [/\bappropriate\b/gi, ["right", "fitting", "suitable"]],
      [/\badequate\b/gi, ["enough", "fine", "decent"]],
      [/\bcommence\b/gi, ["start", "begin"]],
      [/\bobtain\b/gi, ["get", "grab"]],
      [/\bprovide\b/gi, ["give", "offer"]],
      [/\brequire\b/gi, ["need", "call for"]],
      [/\bassist\b/gi, ["help"]],
      [/\bregarding\b/gi, ["about", "on"]],
      [/\bconsequently\b/gi, ["so", "as a result"]],
    ];

    [...informalReplacements, ...englishInformalReplacements].forEach(([pattern, replacements]) => {
      result = result.replace(pattern, (match) => {
        if (Math.random() > t.medium) {
          modifications++;
          const replacement = replacements[Math.floor(Math.random() * replacements.length)];
          return match[0] === match[0].toUpperCase()
            ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
            : replacement;
        }
        return match;
      });
    });

    // 5. Varier la ponctuation
    // Remplacer parfois les virgules par des tirets
    result = result.replace(/,/g, (match) => {
      if (Math.random() > t.rare) {
        modifications++;
        return " –";
      }
      return match;
    });

    // Ajouter des points de suspension pour simuler la réflexion
    result = result.replace(/\.\s+([A-Z])/g, (match, letter) => {
      if (Math.random() > t.rare) {
        modifications++;
        return `... ${letter}`;
      }
      return match;
    });

    // 6. Contractions familières (utilisées avec modération)
    const contractions: [RegExp, string][] = [
      [/\bil y a\b/gi, "y'a"],
      [/\bparce que\b/gi, "parce que"],
      [/\bpeut-être\b/gi, "p'têt"],
      [/\bquelque chose\b/gi, "un truc"],
    ];

    contractions.forEach(([pattern, replacement]) => {
      if (Math.random() > t.high) {
        result = result.replace(pattern, (match) => {
          if (Math.random() > t.high) {
            modifications++;
            return replacement;
          }
          return match;
        });
      }
    });

    // 7. Ajouter des questions rhétoriques occasionnelles
    const rhetoricalQuestions = [
      "Et pourquoi pas ?",
      "Logique, non ?",
      "On comprend pourquoi.",
      "Intéressant, n'est-ce pas ?",
    ];

    const paragraphs = result.split(/\n\n/);
    if (paragraphs.length > 2 && Math.random() > t.medium) {
      const insertIndex = Math.floor(Math.random() * (paragraphs.length - 1)) + 1;
      const lastSentence = paragraphs[insertIndex - 1];
      if (lastSentence && lastSentence.endsWith(".")) {
        paragraphs[insertIndex - 1] = lastSentence.slice(0, -1) + ". " + 
          rhetoricalQuestions[Math.floor(Math.random() * rhetoricalQuestions.length)];
        modifications++;
      }
      result = paragraphs.join("\n\n");
    }

    // 8. Introduire de légères imperfections (fautes de frappe corrigées visuellement)
    // Ajouter des répétitions naturelles
    result = result.replace(/\b(très|vraiment|assez)\b/gi, (match) => {
      if (Math.random() > t.high) {
        modifications++;
        return match + ", " + match;
      }
      return match;
    });

    // 9. Varier les structures de liste
    result = result.replace(/^(\s*[-•])/gm, (match) => {
      if (Math.random() > t.medium) {
        modifications++;
        const alternatives = ["→", "—", "·", "∙"];
        return alternatives[Math.floor(Math.random() * alternatives.length)];
      }
      return match;
    });

    // 10. Ajouter des parenthèses explicatives
    const parentheticalInserts = [
      [/\b(important)\b/gi, "$1 (et c'est le cas)"],
      [/\b(évident)\b/gi, "$1 (ou presque)"],
      [/\b(simple)\b/gi, "$1 (en théorie)"],
    ];

    parentheticalInserts.forEach(([pattern, replacement]) => {
      if (Math.random() > t.high) {
        result = result.replace(pattern as RegExp, () => {
          if (Math.random() > t.high) {
            modifications++;
            return replacement as string;
          }
          return (pattern as RegExp).source;
        });
      }
    });

    return {
      humanizedText: result,
      modificationsCount: modifications,
    };
  }, [humanizeIntensity]);

  const performHumanize = useCallback(() => {
    if (!text) return;

    setIsHumanizing(true);

    setTimeout(() => {
      const result = humanizeText(text, humanizeIntensity);
      setText(result.humanizedText);
      setHumanizeStats(result);
      setIsHumanized(true);
      setIsHumanizing(false);
    }, 500);
  }, [text, humanizeText, humanizeIntensity]);

  const clearAll = useCallback(() => {
    setText("");
    setFileName(null);
    setIsCleaned(false);
    setIsHumanized(false);
    setStats(null);
    setHumanizeStats(null);
  }, []);

  const downloadFile = useCallback(() => {
    if (!text) return;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const outputName = fileName
      ? fileName.replace(".txt", "_nettoyé.txt")
      : "texte_nettoyé.txt";
    
    link.href = url;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [text, fileName]);

  const copyToClipboard = useCallback(async () => {
    if (!text) return false;
    
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, [text]);

  return {
    text,
    setText,
    fileName,
    isProcessing,
    isHumanizing,
    isCleaned,
    isHumanized,
    stats,
    humanizeStats,
    humanizeIntensity,
    setHumanizeIntensity,
    loadFile,
    performClean,
    performHumanize,
    clearAll,
    downloadFile,
    copyToClipboard,
  };
};
