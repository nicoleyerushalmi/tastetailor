/** Curated, editorial list — vet names/styles/websites before adding more. */
export type KnownCreator = {
  name: string;
  /** Short descriptor used as extra grounding context for the model. */
  style?: string;
  /** Canonical blog/site the model should search first. */
  website?: string;
};

export const KNOWN_CREATORS: KnownCreator[] = [
  {
    name: "Half Baked Harvest",
    style: "Cozy, produce-heavy, globally-influenced comfort food",
    website: "https://www.halfbakedharvest.com",
  },
  {
    name: "Bon Appétit",
    style: "Test-kitchen developed, trend-forward, broad range",
    website: "https://www.bonappetit.com",
  },
  {
    name: "NYT Cooking",
    style: "Editorially vetted, wide range of contributing chefs",
    website: "https://cooking.nytimes.com",
  },
  {
    name: "Serious Eats",
    style: "Recipe-testing and technique-focused",
    website: "https://www.seriouseats.com",
  },
  {
    name: "Binging with Babish",
    style: "Recreations of movie/TV dishes, approachable technique breakdowns",
    website: "https://www.bingingwithbabish.com",
  },
  {
    name: "Koby Edri",
    style: "Israeli comfort food, Moroccan-inspired dishes, one-pot meals, viral home cooking",
    website: "https://kobiedri.co.il",
  },
  {
    name: "Ron Yohananov",
    style: "Family-friendly Israeli cooking, baking, Bukharian cuisine, holiday recipes",
    website: "https://www.ronyohananov.com",
  },
  {
    name: "Daniel Amit",
    style: "Modern Israeli home cooking, quick comfort food, social-media-friendly recipes",
    website: "https://danielamit.com",
  },
  {
    name: "Karin Goren",
    style: "Baking, desserts, cakes, pastries, classic Israeli recipes",
    website: "https://www.carine.co.il",
  },
  {
    name: "Niki B",
    style: "Simple everyday Israeli home cooking, family meals, baking",
    website: "https://nikib.co.il",
  },
  {
    name: "Oz Telem",
    style: "Technique-driven home cooking with detailed explanations and vegetable-focused recipes",
    website: "https://www.oztelem.com",
  },
  {
    name: "Jamie Geller",
    style: "Kosher, Jewish and Israeli cuisine, family meals, holiday recipes",
    website: "https://jamiegeller.com",
  },
  {
    name: "Miri Cohen",
    style: "Quick family recipes, comfort food, baking, weeknight meals",
    website: "https://miri-cohen.com",
  },
  {
    name: "Israel Aharoni",
    style: "Asian cuisine, Israeli classics, chef techniques, international flavors",
    website: "https://www.israelaharoni.co.il",
  },
  {
    name: "Haim Cohen",
    style: "Mediterranean cuisine, modern Israeli comfort food",
    website: "https://foody.co.il",
  },
  {
    name: "Meir Adoni",
    style: "Modern Mediterranean, fine dining, Middle Eastern fusion",
    website: "https://www.meiradoni.com",
  },
  {
    name: "Eyal Shani",
    style: "Vegetable-forward Israeli cuisine, ingredient-first cooking, pita and tomatoes",
    website: "https://www.miznon.co.il",
  },
  {
    name: "Tom Aviv",
    style: "Modern Israeli cuisine, restaurant-inspired comfort food",
    website: "https://www.instagram.com/tom_aviv/",
  },
  {
    name: "Sarit Novak",
    style: "Home baking, pastries, desserts, Israeli family cooking",
    website: "https://www.instagram.com/misspetel/",
  },
  {
    name: "Adi Klinghofer",
    style: "Baking, challah, pastries, desserts",
    website: "https://adikosh.co.il",
  },
  {
    name: "Racheli Ver-Nir",
    style: "Israeli home cooking, family meals, baking",
    website: "https://www.instagram.com/rachelivernir/",
  },
  {
    name: "Shiran Dickman",
    style: "Home cooking, comfort food, easy everyday recipes",
    website: "https://www.instagram.com/shiran_dickman/",
  },
  {
    name: "Lior Mashiach",
    style: "Creative home cooking, comfort food, modern Israeli recipes",
    website: "https://www.instagram.com/lioroooosh/",
  },
  {
    name: "Oded Talmor",
    style: "Keto, low-carb, healthy Israeli cooking",
    website: "https://ketochef.co.il",
  },
  {
    name: "Peas Love & Carrots",
    style: "Kosher family cooking, Jewish comfort food, entertaining",
    website: "https://peaslovencarrots.com",
  },
{
    name: "Shahar & Oren (Sooo)",
    style: "Modern home cooking, international cuisine, Asian influences, recipe discovery and practical cooking guides",
    website: "https://sooo.co.il",
  },
  {
    name: "Elita Ofek",
    style: "Modern home cooking, Asian-inspired dishes, entertaining, premium ingredients and creative recipes",
    website: "https://elitaofek.co.il",
  },
  {
    name: "Joshua Weissman",
    style: "From-scratch cooking, technique-focused recipes, restaurant recreations, food education",
    website: "https://www.joshuaweissman.com",
  },
  {
    name: "Binging with Babish (Andrew Rea)",
    style: "Pop-culture recipes, cooking fundamentals, cinematic food recreations",
    website: "https://www.babi.sh",
  },
  {
    name: "Nick DiGiovanni",
    style: "High-energy cooking, viral recipes, chef techniques, global cuisine",
    website: "https://www.nickdigiovanni.com",
  },
  {
    name: "J. Kenji López-Alt",
    style: "Science-driven cooking, deep technique explanations, tested recipes",
    website: "https://www.seriouseats.com/j-kenji-lopez-alt-8422838",
  },
  {
    name: "Yotam Ottolenghi",
    style: "Middle Eastern-inspired, Mediterranean, vegetable-forward, bold spices",
    website: "https://ottolenghi.co.uk",
  },
  {
    name: "Ina Garten",
    style: "Classic American cooking, entertaining, reliable comfort food",
    website: "https://barefootcontessa.com",
  },
  {
    name: "Maangchi",
    style: "Authentic Korean home cooking, approachable traditional recipes",
    website: "https://www.maangchi.com",
  },
  {
    name: "Sohla El-Waylly",
    style: "Creative cooking, culinary history, technique education, global flavors",
    website: "https://www.sohlaelwaylly.com",
  },
  {
    name: "Claire Saffitz",
    style: "Advanced baking, pastry, desserts, recipe development",
    website: "https://www.dessertperson.com",
  },
  {
    name: "Chef John (Food Wishes)",
    style: "Classic recipes, approachable techniques, beginner-friendly instruction",
    website: "https://foodwishes.blogspot.com",
  },
  {
    name: "Sally McKenney (Sally's Baking Addiction)",
    style: "Baking, cookies, cakes, tested dessert recipes",
    website: "https://sallysbakingaddiction.com",
  },
  {
    name: "Deb Perelman (Smitten Kitchen)",
    style: "Home cooking, approachable recipes, small-kitchen creativity",
    website: "https://smittenkitchen.com",
  },
  {
    name: "Pati Jinich",
    style: "Mexican cuisine, authentic regional recipes, family cooking",
    website: "https://patijinich.com",
  },
  {
    name: "David Chang",
    style: "Modern Asian cuisine, chef-driven recipes, culinary experimentation",
    website: "https://www.momofuku.com",
  },
  {
    name: "Alton Brown",
    style: "Food science, cooking techniques, educational recipes",
    website: "https://altonbrown.com",
  },
  {
    name: "Vahchef (Sanjay Thumma)",
    style: "Indian cuisine, traditional recipes, step-by-step cooking education",
    website: "https://www.vahrehvah.com",
  },
  {
    name: "Nisha Madhulika",
    style: "Indian vegetarian cooking, traditional North Indian recipes, home-style meals",
    website: "https://nishamadhulika.com",
  },
  {
    name: "Hebbars Kitchen",
    style: "Indian vegetarian recipes, quick meals, practical step-by-step recipes",
    website: "https://hebbarskitchen.com",
  },
  {
    name: "GialloZafferano",
    style: "Italian cuisine, authentic regional recipes, pasta and Mediterranean cooking",
    website: "https://www.giallozafferano.com",
  },
  {
    name: "Lidia Bastianich",
    style: "Italian-American cooking, traditional Italian family recipes",
    website: "https://lidiasitaly.com",
  },
  {
    name: "Just One Cookbook (Namiko Chen)",
    style: "Japanese home cooking, authentic Japanese recipes, ingredient guidance",
    website: "https://www.justonecookbook.com",
  },
  {
    name: "Adam Liaw",
    style: "Asian cuisine, Australian cooking, approachable international recipes",
    website: "https://adamliaw.com",
  },
  {
    name: "Marion Grasby",
    style: "Asian-inspired cooking, Thai and Southeast Asian flavors, modern recipes",
    website: "https://www.marionskitchen.com",
  },
  {
    name: "Nagi Maehashi (RecipeTin Eats)",
    style: "Reliable everyday recipes, international comfort food, highly tested dishes",
    website: "https://www.recipetineats.com",
  },
  {
    name: "Tieghan Gerard (Half Baked Harvest)",
    style: "Creative comfort food, seasonal recipes, modern American cooking",
    website: "https://www.halfbakedharvest.com",
  },
  {
    name: "Minimalist Baker",
    style: "Simple recipes, plant-based cooking, vegan and gluten-free options",
    website: "https://minimalistbaker.com",
  },
  {
    name: "Jeanine Donofrio (Love & Lemons)",
    style: "Fresh vegetarian cooking, healthy recipes, seasonal ingredients",
    website: "https://www.loveandlemons.com",
  },
  {
    name: "Gordon Ramsay",
    style: "Restaurant techniques, British cuisine, elevated home cooking",
    website: "https://www.gordonramsay.com",
  },
  {
    name: "Thomas Keller",
    style: "French technique, fine dining methods, precision cooking",
    website: "https://www.thomaskeller.com",
  },
  {
    name: "Aaron Franklin",
    style: "Texas BBQ, smoking techniques, barbecue fundamentals",
    website: "https://franklinbbq.com",
  },
];

export function findKnownCreator(query: string): KnownCreator | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return KNOWN_CREATORS.find(
    (creator) =>
      creator.name.toLowerCase() === q || q.includes(creator.name.toLowerCase()),
  );
}
