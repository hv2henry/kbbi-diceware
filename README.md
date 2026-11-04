# kbbi-passphrase

**Diceware-style passphrase word lists for Indonesian, curated from KBBI.**

A 7,776-word core list (one word per 5-dice roll, `11111`–`66666`) built from words indexed
in the *Kamus Besar Bahasa Indonesia*. Companion lists for 2,048-word, BIP-39, and SLIP-39 schemes are seeded from it and
currently live in `demo/`.

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
![Core list: 7776 words](https://img.shields.io/badge/core-7%2C776%20words-blue)

**Try it:** the repo ships a fully client-side passphrase generator in [`demo/`](demo).
A *Check Your Dice Roll* panel looks up real physical dice without generating anything.

---

## Why Diceware?

Dice pick words *uniformly at random*—no human intuition about "what looks random" ever
touches the secret. Each roll over 7,776 words contributes **log₂(7776) ≈ 12.92 bits**:

| Words | Entropy | Verdict |
|---|---|---|
| **4** | **≈ 51.7 bits** | **the commonly accepted minimum** |
| 5 | ≈ 64.6 bits | comfortable for everyday accounts |
| 6 | ≈ 77.5 bits | long-term/high-value accounts |
| 8 | ≈ 103.4 bits | encryption keys, master passwords |
| 12 | ≈ 155.1 bits | the generator's maximum—deep cold storage |

## Repository contents

| File | Description |
|---|---|
| `kbbi-diceware-wordlist.txt` | **The dice list**—7,776 words, codes `11111`–`66666`, alphabetical |
| `kbbi-wordlist.txt` | The same 7,776 words without dice codes—alphabetical, one word per line |
| `demo/kbbi-wordlist-2048`, `demo/kbbi-wordlist-BIP39`, `demo/kbbi-wordlist-SLIP39` | Lists seeded from `kbbi-wordlist.txt`; they stay in `demo/` while the scripts that pick words from it are still being verified for fairness |
| `demo/index.html`, `demo/app.js`, `demo/style.css` | The generator—client-side, CSPRNG, Indonesian and English, 4–12 words via slider, custom separator, light/dark toggle |

Every entry is lowercase `a`–`z` only—no digits, hyphens, spaces, or diacritics—so the lists
drop straight into any diceware or BIP-39-style tool. Codes are the base-6 form of the
alphabetical position (`11111` = word #1 `abad`, `66666` = word #7,776 `zoonosis`), so the
plain list needs no codes—the demo derives the five dice from the position.

After editing the dice list, regenerate the plain list (strip the codes, keep the
alphabetical order):

```sh
awk '!/^#/ && NF == 2 { print $2 }' kbbi-diceware-wordlist.txt > kbbi-wordlist.txt
```

## How to use

1. Roll one die **five times** and read the results as a code, e.g. `1 3 6 2 1` → `13621`.
2. Look the code up in `kbbi-diceware-wordlist.txt`. Repeat for each word—four words is the
   accepted minimum, five or six is the sweet spot.

Example (five rolls):

```
13621 becek
33443 kilometer
26431 jaringan
62156 songkok
23641 genotipe
```

→ passphrase: **`becek kilometer jaringan songkok genotipe`** (≈ 64.6 bits)
→ hyphenated, if a form rejects spaces: `becek-kilometer-jaringan-songkok-genotipe`

Rolling physical dice at home? The *Check Your Dice Roll* panel is a plain lookup: click the
five faces until they match your roll and read off the word—no randomness involved.

Tips: roll honestly (real dice, not your head), never reuse a passphrase, and keep the list
version consistent—codes are reassigned between versions, so a roll made against an older
file maps to different words.

## What makes this list different

- **KBBI-indexed, not KBBI-prescribed**—every entry is a headword in KBBI Edisi VI. Where the
  prescribed *baku* form is rarer than what people actually write, the list keeps the common
  form: `tauco` (not `taoco`), `yoghurt` (not `yogurt`), `tape` (not `tapai`), `begadang`,
  `ceret`, `relawan`, `ampyang`, `karosel`. Twenty entries flagged *bentuk tidak baku* stay
  on purpose.
- **Colloquial is acceptable**—a sense KBBI marks `(cak)` does not disqualify a word. Food
  and drink get the widest latitude.
- **Safe for civilians**—no military/police rank names, no profanity, no slurs, no sexual
  vocabulary. A few words with a dominant civilian sense stay: `kapten` (a team or ship
  leader), `mayor` (a major key, Ursa Mayor), `balok`, `melati`, `komisaris`, `mantri`.
- **No grammar glue**—clitics (`-nya`, `-kah`, `-pun`, `-lah`), copulas (`adalah`, `ialah`),
  and address particles are excluded; every entry stands on its own.
- **Words, not paradigms**—a root sits next to the derived forms people actually use (`baca`,
  `bacaan`, `pembaca`), but no full paradigm is enumerated. Derived forms are kept where the
  bare stem rarely stands alone—`kenan` lives inside `berkenan`, `kendara` inside
  `kendaraan`—and pre-categorial stems are kept to a minimum so passphrase syntax stays
  flexible.
- **No doublets**—two forms are never kept for one meaning (`khabar→kabar`, `isteri→istri`,
  `nafas→napas`, `jenius→genius`, `zirafah→jerapah`). Both forms survive only where usage
  really separates them: `risol` (bihun filling) and `risoles` (ragut filling) are different
  snacks.
- **Flora & fauna Nusantara**—`bekantan`, `anoa`, `kasuari`, `kahiyu` (orangutan), `yaki`,
  `pelanduk`, `betet`, `owa`, `gandaria`, `andalas`, `melati`, `senduduk`.
- **Local snacks**—`risol`, `risoles`, `aliagrem`, `cilok`, `klepon`.
- **Local dishes**—`rendang`, `seblak`, `tempoyak`.
- **General vocabulary across fields**—science, the social sciences and humanities, the arts,
  and sport, so the words stay recognisable to any Indonesian reader.
- **Seed for derived lists**—`kbbi-wordlist.txt` can seed `kbbi-wordlist-2048`,
  `kbbi-wordlist-BIP39`, and `kbbi-wordlist-SLIP39`. No wallet ships an Indonesian word list,
  so these are for your own tooling.

## Data sources & attribution

1. **KBBI word list** (primary data)—Indonesian words from *Kamus Besar Bahasa Indonesia*:
   [perlancar/perl-WordList-ID-KBBI](https://github.com/perlancar/perl-WordList-ID-KBBI)
   (`WordList::ID::KBBI`, licensed under the same terms as Perl 5). The dictionary itself is
   published by **Badan Pengembangan dan Pembinaan Bahasa, Kemendikdasmen**
   (<https://kbbi.kemendikdasmen.go.id/>). This project is not affiliated with or endorsed by
   Badan Bahasa.

2. **KBBI Edisi VI data** (curation guardrail)—[Definisi/kbbi](https://github.com/Definisi/kbbi),
   the full 194,692-entry KBBI v6.0.2 dataset extracted from the official KBBI app, used during
   curation to check each candidate's headword status, meanings, and register labels.

3. **Kateglo** (<https://kateglo.org> | [Original Repository](https://github.com/ivanlanin/kateglo) from Ivan Lanin)—an API for clean, well-labelled Indonesian word
   datasets, used alongside KBBI during curation.

## License

The curated lists and documentation are licensed under the
[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
license.

## Security notes

- For high-value secrets, still roll physical dice: a browser you do not control is a weaker
  source of randomness than five pieces of plastic.
- Treat any generated example in this repo as compromised—never use documentation samples as
  actual passwords.
- Entropy figures assume fair dice and honest rolls. A word you choose yourself is worth
  roughly zero bits.
