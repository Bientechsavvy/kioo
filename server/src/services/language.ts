import type { Lang } from "../types";

const FR = new Set("le la les un une des du de et est sont que qui quoi quel quelle quels quelles comment pourquoi quand où dans pour avec sans sur sous avant après il elle ils elles nous vous ce cette ces au aux ne pas ou mais donc être faut doit dois peut peuvent".split(" "));
const EN = new Set("the a an of and is are what which who whom how why when where in for with without on before after it they we you this that these to be must should can do does".split(" "));

/** Guess English or French from the question. Accented letters and common words are the signal. */
export function detectLanguage(text: string): Lang {
  const words = text.toLowerCase().split(/[^a-zàâçéèêëîïôûùüÿœ']+/).filter(Boolean);
  let fr = /[àâçéèêëîïôûùüÿœ]/i.test(text) ? 1 : 0;
  let en = 0;
  for (const w of words) {
    if (FR.has(w)) fr++;
    if (EN.has(w)) en++;
  }
  return fr > en ? "fr" : "en";
}

export const MESSAGES = {
  en: {
    noDocuments: "There are no documents in your library yet. Add a document first, then ask your question.",
    notFound: "I could not find the answer in your documents. Try different words, or add the document that contains it.",
    modelDown: "The local AI model is not available, so I cannot write an answer. The passages below were found in your documents.",
  },
  fr: {
    noDocuments: "Votre bibliothèque ne contient pas encore de document. Ajoutez un document, puis posez votre question.",
    notFound: "Je n'ai pas trouvé la réponse dans vos documents. Essayez d'autres mots, ou ajoutez le document qui la contient.",
    modelDown: "Le modèle d'IA local n'est pas disponible, je ne peux donc pas rédiger de réponse. Les passages ci-dessous ont été trouvés dans vos documents.",
  },
} as const;
