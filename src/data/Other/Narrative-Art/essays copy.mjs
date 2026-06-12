const buildBodyFromSections = (sections) => sections.map((section) => {
  const heading = section.subhead ? `<h2>${section.subhead}</h2>\n\n` : "";
  const paragraphs = section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n\n");
  return `${heading}${paragraphs}`;
}).join("\n\n");

const createEssay = ({ slug, title, subtitle, heroTitleLines, heroImageId, sections }) => ({
  slug,
  title,
  subtitle,
  heroTitleLines,
  heroImageId,
  sections,
  body: buildBodyFromSections(sections)
});

export const essays = [
  createEssay({
    slug: "the-story-we-expect-to-be-told",
    title: "The Story We Expect to Be Told",
    subtitle: "How narrative art came to mean story first, image second",
    heroTitleLines: ["The Story", "We Expect", "to Be Told"],
    heroImageId: "i-LCspRF4",
    sections: [
      {
        paragraphs: [
          `For as long as we've talked about narrative art, the definition has felt simple.`,
          `An image tells a story.`,
          `Not just something beautiful to look at - but something meaningful. Something with weight. A moment connected to something before it, and something after. A fragment of a larger sequence that already exists.`
        ]
      },
      {
        subhead: "The Expectation Is Clear",
        paragraphs: [
          `The artist knows the story.<br>The image reveals it.<br>The viewer receives it.`,
          `And for the most part, this has held.`,
          `From early narrative painting rooted in myth and religion, to the literary scenes that shaped Western imagery, the structure has remained largely intact. The story exists first. The image follows.`,
          `Even in the work of Frederic Remington and Charles Marion Russell, where the moment feels immediate - caught mid-action rather than formally staged - there is still a sense that what we are seeing belongs to something already known. A larger account, just outside the frame.`,
          `The image doesn't create the story.<br>It points to it.`
        ]
      },
      {
        subhead: "That Understanding Carries Forward",
        paragraphs: [
          `Norman Rockwell was often described as telling entire stories within a single image. The idea persists because it feels true. His scenes are clear, expressive, and complete in a way that invites recognition. You understand what's happening. You understand why it matters.`,
          `The story is there.`,
          `Or at least, it appears to be.`,
          `Because if you stay with those images a little longer, something else begins to happen.`,
          `Not immediately.<br>But quietly.`,
          `A hesitation.`,
          `A sense that what you're seeing isn't fully resolved. That there's something just beyond what's shown - something you can't quite access, but can't ignore either.`,
          `It's not confusion.`,
          `It's something closer to incompleteness.`
        ]
      },
      {
        subhead: "Which Raises a Quiet Question",
        paragraphs: [
          `And that feeling isn't limited to painting.`,
          `In cinema, the same idea emerges in a different form. Steven Spielberg once spoke about the power of a single frame to suggest an entire unfolding story. Not by explaining it - but by placing you inside a moment that clearly extends beyond itself.`,
          `A glance.<br>A pause.<br>A gesture that implies consequence.`,
          `You don't need the full film to feel it.`,
          `If a single image can hold that kind of tension -<br>if it can suggest something before and something after -<br>if it can feel incomplete without feeling lacking -`,
          `Then what, exactly, is the role of the story we assume it's telling?`,
          `We've been taught to look at narrative art as something that delivers meaning. Something that provides a coherent account, even if only in part.`,
          `But certain images don't behave that way.`,
          `They don't resolve.`,
          `They don't explain.`,
          `They don't quite give you what you're expecting.`,
          `And yet... they stay with you longer.`,
          `Not because they told you everything -<br>but because they didn't.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "the-moment-that-refuses-to-finish",
    title: "The Moment That Refuses to Finish",
    subtitle: "Why suspended moments open narrative instead of closing it",
    heroTitleLines: ["The Moment", "That Refuses", "to Finish"],
    heroImageId: "i-ncFcHDM",
    sections: [
      {
        paragraphs: [
          `There are images that feel complete the moment you see them.`,
          `You understand the action.<br>You recognize the emotion.<br>You can describe what's happening without hesitation.`,
          `They hold your attention briefly, then release it just as easily.`
        ]
      },
      {
        subhead: "And Then There Are Others",
        paragraphs: [
          `Images that resist that kind of quick resolution. Not because they are unclear - but because they seem to exist in a moment that hasn't fully settled.`,
          `Something has already happened.<br>Something else is about to.`,
          `But the image never tells you which matters more.`,
          `You're left in between.`,
          `This isn't new.`,
          `Much of Western narrative art has depended on this kind of suspended moment. A figure turning. A confrontation just beginning. A decision not yet made. The scene is carefully chosen - not for what it shows, but for what it implies.`
        ]
      },
      {
        subhead: "Implication Does Something Different",
        paragraphs: [
          `And implication does something different than explanation.`,
          `Explanation closes a loop.`,
          `Implication opens one.`,
          `The moment becomes less about what is happening, and more about what could happen. Possibility begins to replace certainty. The image no longer behaves like a fixed account - it starts to feel like an entry point.`,
          `You begin to lean into it.`,
          `Not physically.<br>But mentally.`,
          `Trying to locate where you are in the sequence. Trying to understand what came before. Trying to predict what comes next.`
        ]
      },
      {
        subhead: "The Image Asks for Them",
        paragraphs: [
          `And the longer you stay with it, the more you realize:`,
          `The image isn't giving you those answers.`,
          `It's asking for them.`,
          `This is where something shifts.`,
          `Because if the moment refuses to finish itself -<br>if it remains open, suspended, unresolved -`,
          `Then the act of viewing is no longer passive.`,
          `You're no longer just seeing what's there.`,
          `You're participating in something that hasn't been fully defined.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "who-owns-the-story",
    title: "Who Owns the Story",
    subtitle: "How meaning shifts once the viewer enters the frame",
    heroTitleLines: ["Who Owns", "the Story"],
    heroImageId: "i-c5K798H",
    sections: [
      {
        paragraphs: [
          `If an image suggests a story, the natural assumption is that the story belongs to the artist.`,
          `It was their intention.<br>Their construction.<br>Their decision about what to show and what to leave out.`,
          `The viewer's role, then, is to recognize it. To interpret what has already been placed there. To understand the meaning that exists within the image.`,
          `That model feels stable.`,
          `It also feels incomplete.`
        ]
      },
      {
        subhead: "The Story Doesn't Feel Entirely Authored",
        paragraphs: [
          `Because when you encounter an image that doesn't fully resolve - one that holds tension instead of closure - you begin to notice something uncomfortable.`,
          `The story doesn't feel entirely authored.`,
          `You can sense the structure.<br>You can see the intention.<br>But the meaning doesn't arrive fully formed.`,
          `It builds.`,
          `And it builds differently depending on who is looking.`,
          `One viewer sees confrontation.<br>Another sees hesitation.<br>Another sees inevitability.`,
          `None of them are wrong.`,
          `But none of them are fully contained within the image itself either.`
        ]
      },
      {
        subhead: "Which Raises a More Difficult Question",
        paragraphs: [
          `If the story changes with the viewer -<br>if it expands, shifts, and takes on different forms depending on who steps into it -`,
          `Then who, exactly, owns it?`,
          `The artist initiates something. That much is clear.`,
          `They choose the moment.<br>They define the boundaries.<br>They create the conditions.`,
          `But what happens inside those conditions is less controlled.`,
          `It unfolds.`
        ]
      },
      {
        subhead: "It Activates Them",
        paragraphs: [
          `Not just from what is shown -<br>but from what the viewer brings with them.`,
          `Memory.<br>Expectation.<br>Experience.`,
          `The image doesn't override those things.`,
          `It activates them.`,
          `And once that activation begins, the story is no longer fixed.`,
          `It's shared.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "the-image-that-asks-something-of-you",
    title: "The Image That Asks Something of You",
    subtitle: "Why the image changes when text changes where you stand",
    heroTitleLines: ["The Image", "That Asks", "Something of You"],
    heroImageId: "i-7Mzzbvp",
    sections: [
      {
        paragraphs: [
          `Some images are easy to move past.`,
          `You understand them quickly. You take in what they offer, and you move on without resistance.`,
          `Others don't let you go so easily.`,
          `They hold you - not because they are louder or more dramatic, but because they seem to require something from you that isn't immediately obvious.`,
          `Time, maybe.`,
          `Attention.`,
          `Or something less tangible.`,
          `A willingness to stay with uncertainty.`
        ]
      },
      {
        subhead: "This Is Where the Experience Changes",
        paragraphs: [
          `This is where the experience of narrative begins to change.`,
          `Because the image alone, while complete in its form, doesn't fully resolve the tension it creates. It establishes a moment. It invites interpretation. But it also leaves space - space that isn't filled by what is visible.`,
          `And in that space, something else can enter.`,
          `Not as explanation.`,
          `Not as correction.`,
          `But as expansion.`
        ]
      },
      {
        subhead: "The Writing Opens It",
        paragraphs: [
          `The image does not require explanation.<br>But the writing opens it beyond what the viewer already knows.`,
          `Not by telling you what to see.`,
          `But by shifting where you stand in relation to it.`,
          `A line of text can redirect attention. It can introduce a possibility that wasn't immediately apparent. It can destabilize what felt certain, or deepen what felt intuitive.`,
          `The image remains intact.`,
          `But its boundaries begin to loosen.`
        ]
      },
      {
        subhead: "You're Inside It",
        paragraphs: [
          `What once felt contained begins to extend outward - into memory, into imagination, into a space that isn't entirely defined by what's visible.`,
          `You're no longer just looking at the moment.`,
          `You're inside it.`,
          `And once that happens, the question isn't just what the image shows.`,
          `It's what it's asking you to complete.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "the-story-that-isnt-finished",
    title: "The Story That Isn't Finished",
    subtitle: "When narrative continues beyond the frame and beyond the viewer",
    heroTitleLines: ["The Story", "That Isn't", "Finished"],
    heroImageId: "i-gxMVNh3",
    sections: [
      {
        paragraphs: [
          `There is a natural impulse to resolve a story.`,
          `To understand what happened.<br>To reach a conclusion.<br>To close the loop.`,
          `Much of narrative art has been built around that expectation. Even when only a fragment is shown, it often points clearly toward a larger, coherent whole. The viewer is guided toward an answer, even if that answer exists just beyond the frame.`
        ]
      },
      {
        subhead: "But Not All Images Lead That Way",
        paragraphs: [
          `Some remain open.`,
          `Not unfinished in the sense of being incomplete - but unfinished in the sense of being ongoing. They don't move toward resolution. They resist it.`,
          `And in doing so, they create a different kind of experience.`,
          `One that doesn't end when you look away.`,
          `The story doesn't stay behind in the image.`,
          `It follows you.`
        ]
      },
      {
        subhead: "It Shifts Over Time",
        paragraphs: [
          `It shifts over time. It changes as you change. What felt like tension becomes clarity. What felt like certainty becomes doubt. The moment continues to unfold, even though the image itself never changes.`,
          `This isn't a failure of narrative.`,
          `It may be its deepest form.`,
          `Because a completed story is received.`,
          `An unfinished one is lived.`
        ]
      },
      {
        subhead: "It Doesn't Really End",
        paragraphs: [
          `The image invites interpretation.<br>The writing expands it beyond what the viewer already knows.<br>The viewer completes the story.`,
          `And once that process begins - once the story is no longer fully contained, no longer fully resolved -`,
          `It doesn't really end.`,
          `It just keeps finding new ways to continue.`
        ]
      }
    ]
  })
];