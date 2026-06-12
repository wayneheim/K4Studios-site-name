const buildBodyFromSections = (sections) => sections.map((section) => {
  const heading = section.subhead ? `<h2>${section.subhead}</h2>\n\n` : "";
  const paragraphs = section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n\n");
  return `${heading}${paragraphs}`;
}).join("\n\n");
 
const createEssay = ({ slug, title, subtitle, heroTitleLines, heroImageId, audioVolume = 0.3, sections }) => ({
  slug,
  title,
  subtitle,
  heroTitleLines,
  heroImageId,
  audioSrc: `https://media.k4studios.com/NarrativeArt/${slug}.mp3`,
  audioVolume,
  sections,
  body: buildBodyFromSections(sections)
});
 
export const essays = [
  createEssay({
    slug: "the-story-we-expect-to-be-told",
    title: "The Story We Expect to Be Told",
    subtitle: "Why some images ask for more than admiration.",
    heroTitleLines: ["The Story", "We Expect", "to Be Told"],
    heroImageId: "i-LCspRF4",
    sections: [
      {
        paragraphs: [
          `The sun is setting over a secluded mountain lake. Mist rises in the cool evening air. The last warm light silhouettes the rugged skyline, while the dark shapes of pine trees gather at the water's edge.`,
          `You can see it, can't you? Maybe even smell the pine, or feel the crisp edge of fall sneaking into the air.`,
          `That kind of image can absolutely be beautiful. It's why we linger at a sunset, why we stand at the water's edge longer than we planned. It reminds, it impresses, it stirs emotion without asking us to participate.`,
          `But is this really a story?`
        ]
      },
      {
        subhead: "Not Every Image Asks the Same Thing",
        paragraphs: [
          `Some images document.<br>Some decorate.<br>Some offer nostalgia, memory, comfort, or the feeling of a place you've never been but somehow already miss.`,
          `There is value in all of that.`,
          `But every now and then you come across an image that feels different.`,
          `Like a song that knows something about you before you've told it anything. Like a sermon aimed at the wrong pew. Like an old story that keeps changing its ending depending on when you hear it.`,
          `Those images aren't just beautiful.`,
          `They're asking something.`
        ]
      },
      {
        subhead: "The Great Storytellers Understood This",
        paragraphs: [
          `Remington. Russell. Wyeth. Rockwell.`,
          `Their strongest work didn't ask you to admire a scene. It put you inside a moment with pressure behind it.`,
          `A decision not yet made.<br>A consequence not yet known.<br>A question still hanging in the air like smoke that hasn't found the door.`,
          `They understood that narrative art walks a tightrope. Give the viewer enough to enter. Don't give them enough to escape unchanged.`,
          `That's a different thing than a beautiful sunset.`,
          `That's a different thing entirely.`
        ]
      },
      {
        subhead: "The Image Turns",
        paragraphs: [
          `The details are what pull you in first.`,
          `The old coat.<br>The weathered face.<br>The gun smoke.<br>The trail fading into dust.<br>The lantern light falling across a room that belongs to another century.`,
          `Those details are the nectar. They draw you out of your own life — away from the schedules, the noise, the small structures that keep the day moving and the deeper questions quiet.`,
          `You think you're just looking into another world.`,
          `And then the image turns.`,
          `Like a teacher calling on an unprepared student.`,
          `Suddenly it's asking questions only you can answer. Questions about what you know, what you've carried, what you thought you'd left behind somewhere further back down the road.`,
          `That's where narrative art begins its real work.`,
          `Not in the telling.`,
          `In the asking.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "the-moment-that-refuses-to-finish",
    title: "The Moment That Refuses to Finish",
    subtitle: "Why suspended moments open narrative instead of closing it.",
    heroTitleLines: ["The Moment", "That Refuses", "to Finish"],
    heroImageId: "i-ncFcHDM",
    sections: [
      {
        paragraphs: [
          `There are images that release us almost as quickly as they catch us.`,
          `We understand the action.<br>We recognize the emotion.<br>We know what we are meant to feel.`,
          `They may be beautiful. They may be skillful. They may even be memorable for a while.`,
          `But they close the door behind themselves.`,
          `The moment is complete, and because it is complete, we are free to move on.`
        ]
      },
      {
        subhead: "And Then There Are Others",
        paragraphs: [
          `The ones that hold us in place.`,
          `Not because they are confusing. Not because they hide the subject from view.`,
          `But because they seem to happen in the breath between one truth and the next.`,
          `Something has already happened.<br>Something else is about to.`,
          `The image refuses to tell us which matters more.`,
          `So we are left standing in between, where the air is not settled and the story has not yet decided what it is going to become.`
        ]
      },
      {
        subhead: "The Breath Before the Answer",
        paragraphs: [
          `That suspended moment has always been one of narrative art's strongest tools.`,
          `A figure turning before we know why.<br>A hand not yet reaching.<br>A rider looking back.<br>A confrontation beginning, but not yet broken open.`,
          `The chosen moment is not powerful only because of what it shows.`,
          `It is powerful because of what it withholds.`,
          `Explanation closes a loop.`,
          `Implication opens one.`,
          `And once that loop is open, the viewer begins doing work the image never announces out loud.`
        ]
      },
      {
        subhead: "The Image Asks for the Rest",
        paragraphs: [
          `We begin to lean into it.`,
          `Not with the body, maybe. But with the mind.`,
          `Trying to understand what came before. Trying to read the faces. Trying to measure the silence. Trying to guess whether the next second brings mercy, violence, regret, or grace.`,
          `The longer we stay, the more we realize the image is not giving us those answers.`,
          `It is asking for them.`,
          `And that is the turn.`,
          `When a moment refuses to finish itself, viewing is no longer passive.`,
          `We are not just seeing what is there.`,
          `We are standing inside what has not yet been fully defined.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "who-owns-the-story",
    title: "Who Owns the Story",
    subtitle: "How meaning shifts once the viewer enters the frame.",
    heroTitleLines: ["Who Owns", "the Story"],
    heroImageId: "i-c5K798H",
    sections: [
      {
        paragraphs: [
          `If an image suggests a story, the natural assumption is that the story belongs to the artist.`,
          `Their intention.<br>Their construction.<br>Their decision about what to show and what to leave outside the frame.`,
          `That seems fair enough.`,
          `The artist chooses the road. The artist lights the room. The artist decides where the silence begins.`,
          `So we come to the image expecting to receive what has been placed there.`
        ]
      },
      {
        subhead: "But the Story Does Not Stay Still",
        paragraphs: [
          `Something changes when the image remains unresolved.`,
          `The story no longer feels entirely owned by the one who made it.`,
          `You can sense the structure.<br>You can feel the intention.<br>You can see the hand that chose the moment.`,
          `But the meaning does not arrive fully formed.`,
          `It builds.`,
          `And it builds differently depending on who is standing before it.`
        ]
      },
      {
        subhead: "What the Viewer Carries In",
        paragraphs: [
          `One viewer sees confrontation.`,
          `Another sees hesitation.`,
          `Another sees a kind of inevitability they have known before, even if they cannot say exactly when.`,
          `Memory has a way of entering the room uninvited.`,
          `So do fear, longing, guilt, duty, grief, and hope.`,
          `The image does not override those things.`,
          `It activates them.`,
          `It sets a match to whatever dry grass the viewer brought along.`
        ]
      },
      {
        subhead: "A Shared Fire",
        paragraphs: [
          `That is why narrative art can feel personal without being private.`,
          `The artist begins the story.`,
          `The image holds the door.`,
          `The viewer brings the weather.`,
          `And once that happens, the story is no longer fixed in the old way. It becomes shared. Not loose. Not careless. Not anything-goes.`,
          `Shared.`,
          `A fire lit by one hand, but felt differently by everyone who comes near it.`,
          `So who owns the story?`,
          `Maybe the better question is who is willing to carry it once it has found them.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "the-image-that-asks-something-of-you",
    title: "The Image That Asks Something of You",
    subtitle: "Why the image changes when text changes where you stand.",
    heroTitleLines: ["The Image", "That Asks", "Something of You"],
    heroImageId: "i-7Mzzbvp",
    sections: [
      {
        paragraphs: [
          `Some images are easy to move past.`,
          `You understand them quickly. You take what they offer, nod to the beauty or the craft, and continue on.`,
          `Others do not let you go so cleanly.`,
          `They hold you. Not because they are louder. Not because they explain more.`,
          `Because they seem to require something from you that you were not planning to give.`,
          `Time, maybe.`,
          `Attention.`,
          `Or the willingness to stand in uncertainty a little longer than comfort allows.`
        ]
      },
      {
        subhead: "The Space the Image Leaves Open",
        paragraphs: [
          `An unresolved image can be complete as a work of art and still unfinished as an experience.`,
          `It establishes a moment. It gives us a world. It offers faces, gestures, light, weather, and consequence.`,
          `But it does not fill every silence.`,
          `It leaves room.`,
          `And in that room, something else can enter.`,
          `Not as explanation.`,
          `Not as correction.`,
          `But as ignition.`
        ]
      },
      {
        subhead: "The Writing Does Not Explain It",
        paragraphs: [
          `The image does not need a caption to survive.`,
          `But the right title, the right line, the right fragment of story can change where we stand in relation to it.`,
          `A title is not always a label. Sometimes it is a boot print at the edge of the frame.`,
          `A line of writing is not always an answer. Sometimes it is the sound from the next room.`,
          `It can redirect attention. It can disturb what felt settled. It can take a scene we thought we understood and tilt the floor beneath it.`,
          `The image remains intact.`,
          `But the boundaries begin to loosen.`
        ]
      },
      {
        subhead: "Now You Are Inside It",
        paragraphs: [
          `That is when the experience changes.`,
          `We are no longer only looking at the moment.`,
          `We are standing somewhere inside it.`,
          `The words do not tell us what to see. They ask us to look again.`,
          `They open another door inside the first one.`,
          `And once that happens, the question is no longer simply what the image shows.`,
          `It is what the image is asking us to complete.`,
          `What we thought was a frame begins to feel more like a threshold.`
        ]
      }
    ]
  }),
  createEssay({
    slug: "the-story-that-isnt-finished",
    title: "The Story That Isn't Finished",
    subtitle: "When narrative continues beyond the frame and the viewer.",
    heroTitleLines: ["The Story", "That Isn't", "Finished"],
    heroImageId: "i-gxMVNh3",
    audioVolume: 0.2,
    sections: [
      {
        paragraphs: [
          `There is a natural impulse to resolve a story.`,
          `To know what happened.<br>To reach the conclusion.<br>To close the loop and set the thing down.`,
          `Much of narrative art has been built around that expectation. Even when we are shown only a fragment, we often look for the larger account.`,
          `Where did this begin?`,
          `Where is it going?`,
          `What does it mean?`,
          `We want the road to lead somewhere clear.`
        ]
      },
      {
        subhead: "But Not All Images Lead That Way",
        paragraphs: [
          `Some remain open.`,
          `Not unfinished because they are lacking.`,
          `Unfinished because they are still alive.`,
          `They do not hurry toward resolution. They resist it.`,
          `And in doing so, they create a different kind of experience.`,
          `One that does not end when we look away.`,
          `The story does not stay behind in the image.`,
          `It follows.`
        ]
      },
      {
        subhead: "What We Carry Changes It",
        paragraphs: [
          `It may come back later, when we are not expecting it.`,
          `A face remembered in traffic. A gesture that returns during a hard conversation. A question that waits until the room is quiet enough to hear it.`,
          `The image itself has not changed.`,
          `But we have.`,
          `What once felt like tension may become clarity. What felt certain may begin to loosen. What seemed to belong to another time may start sounding uncomfortably close to our own.`,
          `This is not a failure of narrative.`,
          `It may be its deepest form.`
        ]
      },
      {
        subhead: "The Story Keeps Moving",
        paragraphs: [
          `A completed story is received.`,
          `An unfinished one is lived.`,
          `The image invites us in.<br>The writing shifts where we stand.<br>The viewer carries the question forward.`,
          `And once that process begins, the story is no longer fully contained by the frame, the wall, the page, or even the artist who first set it in motion.`,
          `It moves from image to memory.`,
          `From memory to meaning.`,
          `From meaning to whatever we choose to do with it next.`,
          `That is why the strongest narrative images do not really end.`,
          `They keep finding new ways to continue.`,
          `Sometimes as a story.`,
          `Sometimes as a question.`,
          `Sometimes as the quiet burden of having finally seen something we can no longer pretend we did not recognize.`
        ]
      }
    ]
  })
];
