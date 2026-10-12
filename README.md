# The Quiet Soldier

**An interactive family exhibition about Lance Corporal Henry John Bowles ("Harry"), 1st Somerset Light Infantry and 1st Wiltshire Regiment, 1914–1918.**

Henry was a Somerset farm hand who went to war, was wounded on the first day of the Somme, and came home to marry, raise a family, and say very little about what he had seen. This exhibition tells his story in eight chapters, through the records he left, the places he stood, and a voice imagined for him.

> **In progress.** All eight chapters are drafted. Photographs and Henry's recorded voice are still being added.

## Visit

- **Exhibition:** `https://build-new-habits.github.io/L-Cpl-Henry-John-Bowles/` (live once GitHub Pages is switched on)
- **Ask the historian:** short, sourced answers to visitors' questions, in [historian.html](historian.html)
- **Design mock-up:** [`mockup/`](mockup/index.html), the original eight-screen design

## The eight chapters

1. **Before:** farm life in Somerset
2. **Why he went:** joining up
3. **Becoming a soldier:** training and crossing to France
4. **The Line:** Redan Ridge, 1 July 1916
5. **Meanwhile in Blighty:** the family at home
6. **The end of the war:** Frémicourt and Bapaume, 1918
7. **After:** marriage, work and what he carried with him
8. **Legacy:** how his family found him again

## How to read what you see

Every image, document and voice in the exhibition carries one of four labels, so you always know what is real.

| Label | Meaning |
|---|---|
| **Archival** | Genuine material from the time, from a public archive |
| **Family record** | From the family's own papers and photographs |
| **Typical of his unit** | Real, but not Henry himself: men just like him |
| **AI reconstruction** | Imagined from the records, and always marked |

## Accessibility

The exhibition is built to meet **WCAG 2.2 and 2.1 AA**. It includes:

- adjustable text size, a dyslexia-friendly font, page tints and line spacing
- reduced motion, which also follows your device setting
- captions and full transcripts for all narration, with nothing that plays automatically
- full keyboard use and large touch targets for tablets and TVs
- content notes before difficult scenes, with options to skip or read a summary
- optional challenges, each with a clear "Skip" button

## Repository contents

| Path | What it is |
|---|---|
| `docs/index.html` | Exhibition home page |
| `docs/mockup/` | Design mock-up screens |
| `docs/assets/` | Styles, scripts, images, audio and maps |

This repository holds the public website only. The research archive behind it is kept privately, and only material that is cleared for publication appears here.

## Publishing

Go to **Settings → Pages**, choose **Deploy from a branch**, then set the branch to `main` and the folder to `/docs`.

## About, sources and AI

- [about.html](about.html): why the family made the exhibition, and who made it
- [making.html](making.html): how it was researched, where AI was used, accessibility and privacy
- [sources.html](sources.html): every source and where it is used, picture credits, rights and how to cite

The source list is built from the chapter files. After editing a chapter, run `python3 tools/build-sources.py`.

## Moving to another web address

The link-preview tags (`og:url`, `og:image`) in each page and `sitemap.xml` use the GitHub Pages address. When the exhibition moves, replace `https://build-new-habits.github.io/L-Cpl-Henry-John-Bowles/` with the new address in those files, and submit the new `sitemap.xml` in Google Search Console.

## Credits and rights

Family photographs and papers are © the Bowles family and may not be reused without permission. Third-party sources are credited where they appear. Material from the Commonwealth War Graves Commission is used with credit to the CWGC.

## Made by

- **Angela Wright**, Henry's granddaughter: *Memories of Grandad*, the family memoir at the heart of the exhibition
- **Graeme Wright**, Henry's great-grandson: exhibition and UX design, additional research
- **Tristan Cobb**, Graeme's cousin: initial research

Built by Graeme Wright at [Build New Habits](https://buildnewhabits.co.uk). Coded with Claude (Anthropic) to Graeme's design.

*In memory of L/Cpl Henry John Bowles, and for the family who carry his story.*
