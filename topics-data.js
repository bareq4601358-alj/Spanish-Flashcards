/* global window */
(() => {
  "use strict";

  /**
   * Topic study: each topic `id` maps to word `tag` values in wordbank.js.
   * `TOPIC_GROUPS` is a flat list (used by topic-main.js); `TOPIC_SECTIONS` organizes the hub UI.
   */
  const TOPIC_SECTIONS = [
    {
      id: "core",
      title: "Core Spanish",
      subtitle: "High-frequency words and how to describe things — study these first.",
      topics: [
        {
          id: "basics",
          label: "Basics & numbers",
          blurb: "Greetings, essentials, numbers, colors, and telling time.",
          tags: ["basics", "numbers", "colors", "time"],
        },
        {
          id: "verbs",
          label: "Verbs",
          blurb: "Common infinitives and verb-focused vocabulary.",
          tags: ["verbs"],
        },
        {
          id: "adjectives",
          label: "Adjectives & description",
          blurb: "Qualities, sizes, and how things look or feel.",
          tags: ["adjectives"],
        },
      ],
    },
    {
      id: "body-wellbeing",
      title: "Body & wellbeing",
      subtitle: "Anatomy, the nervous system, muscles, and health.",
      topics: [
        {
          id: "anatomy",
          label: "Body, brain & muscles",
          blurb: "Body parts, neurons, lobes, and major skeletal muscles.",
          tags: ["body", "neuro", "muscles"],
        },
        {
          id: "health",
          label: "Health & medicine",
          blurb: "Doctor visits, medicine, symptoms, and care.",
          tags: ["health"],
        },
      ],
    },
    {
      id: "daily-life",
      title: "Home & social life",
      subtitle: "Where you live, what you wear, errands, and talking with people.",
      topics: [
        {
          id: "home-daily",
          label: "Home & errands",
          blurb: "House, shopping, clothes, and everyday objects.",
          tags: ["home", "everyday", "shopping", "clothes"],
        },
        {
          id: "food",
          label: "Food & drink",
          blurb: "Cooking, meals, ingredients, and eating out.",
          tags: ["food"],
        },
        {
          id: "people-social",
          label: "People & conversation",
          blurb: "Family, friends, feelings, and useful phrases.",
          tags: ["people", "feelings", "phrases"],
        },
      ],
    },
    {
      id: "out-world",
      title: "Travel, work & outdoors",
      subtitle: "Trips, nature, school, and your job.",
      topics: [
        {
          id: "travel-nature",
          label: "Travel & nature",
          blurb: "Directions, trips, weather, animals, and the outdoors.",
          tags: ["travel", "nature", "weather", "animals"],
        },
        {
          id: "work-school",
          label: "Work & school",
          blurb: "Office, meetings, classes, and studying.",
          tags: ["work", "school", "office"],
        },
      ],
    },
    {
      id: "society",
      title: "Society, tech & sports",
      subtitle: "Screens, news, public life, and staying active.",
      topics: [
        {
          id: "tech-media",
          label: "Tech & media",
          blurb: "Phones, computers, internet, and entertainment.",
          tags: ["tech", "media"],
        },
        {
          id: "civic",
          label: "Civics & society",
          blurb: "Government, law, money, and community life.",
          tags: ["civic"],
        },
        {
          id: "sports",
          label: "Sports & fitness",
          blurb: "Games, exercise, teams, and the gym.",
          tags: ["sports"],
        },
      ],
    },
    {
      id: "yours",
      title: "Your words",
      subtitle: "Only entries you added yourself in this browser.",
      topics: [
        {
          id: "custom",
          label: "My custom words",
          blurb: "Your personal additions — same save/hide as the main deck.",
          tags: ["custom"],
        },
      ],
    },
  ];

  window.TOPIC_SECTIONS = TOPIC_SECTIONS;
  window.TOPIC_GROUPS = TOPIC_SECTIONS.flatMap((sec) => sec.topics);
})();
