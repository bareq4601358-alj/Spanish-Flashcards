/* global window */
(() => {
  "use strict";

  /**
   * Topic study: each id maps to one or more word `tag` values from wordbank.js.
   * Every standard tag appears in exactly one topic (custom words use tag "custom").
   */
  window.TOPIC_GROUPS = [
    {
      id: "anatomy",
      label: "Body, brain & muscles",
      blurb: "Parts of the body, nervous system, and skeletal muscle.",
      tags: ["body", "neuro", "muscles"],
    },
    {
      id: "basics",
      label: "Basics & numbers",
      blurb: "Greetings, core words, numbers, colors, and time.",
      tags: ["basics", "numbers", "colors", "time"],
    },
    {
      id: "verbs",
      label: "Verbs",
      blurb: "Infinitives and verb-focused vocabulary.",
      tags: ["verbs"],
    },
    {
      id: "food",
      label: "Food & drink",
      blurb: "Kitchen, meals, and ingredients.",
      tags: ["food"],
    },
    {
      id: "travel-nature",
      label: "Travel & nature",
      blurb: "Trips, outdoors, weather, and animals.",
      tags: ["travel", "nature", "weather", "animals"],
    },
    {
      id: "work-school",
      label: "Work & school",
      blurb: "Jobs, meetings, classes, and the office.",
      tags: ["work", "school", "office"],
    },
    {
      id: "home-daily",
      label: "Home & daily life",
      blurb: "Household, errands, shopping, and clothes.",
      tags: ["home", "everyday", "shopping", "clothes"],
    },
    {
      id: "people-social",
      label: "People & conversation",
      blurb: "People, feelings, and useful phrases.",
      tags: ["people", "feelings", "phrases"],
    },
    {
      id: "tech-media",
      label: "Tech & media",
      blurb: "Devices, online life, news, and entertainment.",
      tags: ["tech", "media"],
    },
    {
      id: "health",
      label: "Health",
      blurb: "Body care, medicine, and the doctor.",
      tags: ["health"],
    },
    {
      id: "adjectives",
      label: "Adjectives & description",
      blurb: "Qualities and describing words.",
      tags: ["adjectives"],
    },
    {
      id: "civic",
      label: "Civics & society",
      blurb: "Government, law, money, and public life.",
      tags: ["civic"],
    },
    {
      id: "sports",
      label: "Sports & fitness",
      blurb: "Games, exercise, and teams.",
      tags: ["sports"],
    },
    {
      id: "custom",
      label: "My custom words",
      blurb: "Words you added yourself in this browser.",
      tags: ["custom"],
    },
  ];
})();
