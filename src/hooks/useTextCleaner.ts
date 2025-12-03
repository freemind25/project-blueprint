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

export const useTextCleaner = () => {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [stats, setStats] = useState<CleaningResult | null>(null);
  const [humanizeStats, setHumanizeStats] = useState<HumanizeResult | null>(null);

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
  const humanizeText = useCallback((inputText: string): HumanizeResult => {
    let result = inputText;
    let modifications = 0;

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

    // Appliquer les remplacements de transitions
    transitionReplacements.forEach(([pattern, replacements]) => {
      result = result.replace(pattern, (match) => {
        if (Math.random() > 0.5) {
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
      if (sentence.length > 150 && Math.random() > 0.6) {
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
        // N'insérer que très occasionnellement (1 sur 8-10 phrases)
        if (count % Math.floor(Math.random() * 4 + 6) === 0 && Math.random() > 0.6) {
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

    informalReplacements.forEach(([pattern, replacements]) => {
      result = result.replace(pattern, (match) => {
        if (Math.random() > 0.6) {
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
      if (Math.random() > 0.93) {
        modifications++;
        return " –";
      }
      return match;
    });

    // Ajouter des points de suspension pour simuler la réflexion
    result = result.replace(/\.\s+([A-Z])/g, (match, letter) => {
      if (Math.random() > 0.94) {
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
      if (Math.random() > 0.85) {
        result = result.replace(pattern, (match) => {
          if (Math.random() > 0.8) {
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
    if (paragraphs.length > 2 && Math.random() > 0.7) {
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
      if (Math.random() > 0.9) {
        modifications++;
        return match + ", " + match;
      }
      return match;
    });

    // 9. Varier les structures de liste
    result = result.replace(/^(\s*[-•])/gm, (match) => {
      if (Math.random() > 0.7) {
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
      if (Math.random() > 0.9) {
        result = result.replace(pattern as RegExp, () => {
          if (Math.random() > 0.85) {
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
  }, []);

  const performHumanize = useCallback(() => {
    if (!text) return;

    setIsHumanizing(true);

    setTimeout(() => {
      const result = humanizeText(text);
      setText(result.humanizedText);
      setHumanizeStats(result);
      setIsHumanized(true);
      setIsHumanizing(false);
    }, 500);
  }, [text, humanizeText]);

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
    loadFile,
    performClean,
    performHumanize,
    clearAll,
    downloadFile,
    copyToClipboard,
  };
};
