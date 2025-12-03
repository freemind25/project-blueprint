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

    // Expressions de transition à varier
    const transitionReplacements: [RegExp, string[]][] = [
      [/\bEn effet,/gi, ["D'ailleurs,", "En fait,", "À vrai dire,"]],
      [/\bCependant,/gi, ["Mais bon,", "Toutefois,", "Par contre,"]],
      [/\bPar conséquent,/gi, ["Du coup,", "Donc,", "Résultat :"]],
      [/\bDe plus,/gi, ["En plus de ça,", "Aussi,", "Et puis,"]],
      [/\bNéanmoins,/gi, ["Quand même,", "Malgré tout,", "Cela dit,"]],
      [/\bAinsi,/gi, ["Comme ça,", "De cette façon,", "C'est ainsi que"]],
      [/\bFinalement,/gi, ["Au final,", "En fin de compte,", "Pour finir,"]],
      [/\bToutefois,/gi, ["Cela dit,", "Mais bon,", "Quand même,"]],
    ];

    // Appliquer les remplacements de transitions (aléatoirement)
    transitionReplacements.forEach(([pattern, replacements]) => {
      result = result.replace(pattern, () => {
        if (Math.random() > 0.6) {
          modifications++;
          return replacements[Math.floor(Math.random() * replacements.length)];
        }
        return pattern.source.replace(/\\b/g, "").replace(",", ",");
      });
    });

    // Ajouter des expressions familières/naturelles
    const fillerInsertions: [RegExp, string][] = [
      [/\. ([A-Z])/g, ". Bon, $1"],
      [/\. ([A-Z])/g, ". Bref, $1"],
      [/\. ([A-Z])/g, ". Enfin, $1"],
    ];

    // Insérer occasionnellement des fillers
    fillerInsertions.forEach(([pattern, replacement]) => {
      const matches = result.match(pattern);
      if (matches && matches.length > 3 && Math.random() > 0.7) {
        result = result.replace(pattern, (match) => {
          if (Math.random() > 0.85) {
            modifications++;
            return replacement;
          }
          return match;
        });
      }
    });

    // Varier la ponctuation (ajouter des tirets, points de suspension)
    result = result.replace(/,/g, (match) => {
      if (Math.random() > 0.92) {
        modifications++;
        return " –";
      }
      return match;
    });

    // Ajouter occasionnellement des points de suspension
    result = result.replace(/\.\s+([A-Z])/g, (match, letter) => {
      if (Math.random() > 0.95) {
        modifications++;
        return `... ${letter}`;
      }
      return match;
    });

    // Remplacer certains mots trop formels
    const informalReplacements: [RegExp, string[]][] = [
      [/\butiliser\b/gi, ["se servir de", "utiliser", "employer"]],
      [/\bpermettre\b/gi, ["permettre", "donner la possibilité de", "rendre possible"]],
      [/\beffectuer\b/gi, ["faire", "réaliser", "effectuer"]],
      [/\bconstater\b/gi, ["voir", "remarquer", "constater"]],
      [/\bposséder\b/gi, ["avoir", "posséder", "détenir"]],
    ];

    informalReplacements.forEach(([pattern, replacements]) => {
      result = result.replace(pattern, (match) => {
        if (Math.random() > 0.7) {
          modifications++;
          const replacement = replacements[Math.floor(Math.random() * replacements.length)];
          // Préserver la casse
          return match[0] === match[0].toUpperCase()
            ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
            : replacement;
        }
        return match;
      });
    });

    // Contracter certaines expressions
    const contractions: [RegExp, string][] = [
      [/\bne ([a-zéèêëàâäùûüôöîïç]+) pas\b/gi, "ne $1 pas"],
      [/\bil y a\b/gi, "y'a"],
      [/\bce que\b/gi, "c'que"],
    ];

    contractions.forEach(([pattern, replacement]) => {
      if (Math.random() > 0.8) {
        const before = result;
        result = result.replace(pattern, () => {
          if (Math.random() > 0.7) {
            return replacement;
          }
          return pattern.source;
        });
        if (before !== result) modifications++;
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
