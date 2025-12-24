# Debugging Notes - December 23, 2025

## The Problem
Spent hours chasing a logo visibility issue that was self-inflicted by incremental edits.

## What Went Wrong
1. Started with a working build (main@07a3552) 
2. Made CLS fixes that worked
3. While debugging, made multiple small CSS changes to `Landing-HeaderHome.jsx`
4. Each change broke something else - classic whack-a-mole
5. Lost track of what the "known good" state looked like
6. Kept trying to fix symptoms instead of resetting to a known good state

## The Fix
**Hard reset to the last known working commit, then surgically re-add only the needed changes.**

```bash
git reset --hard 07a3552  # Known good commit
# Then re-apply ONLY the specific fix needed
```

## Key Lesson
When you're making 5+ incremental "fixes" and things keep breaking in new ways:
1. STOP
2. Find the last working commit
3. Hard reset to it
4. Re-apply changes ONE AT A TIME, testing after each

## The Actual CLS Fix (what we needed to add)
Only 2 files needed changes from the working state:

### src/pages/index.astro
- Add `.carousel-frame` with fixed height (390px desktop, 200px mobile)
- Position LCP overlay absolutely within frame
- Update fadeDelay to 2800ms
- Update transitions: opacity 1.0s, transform 2.5s

### src/styles/ImageBar2.css  
- Change `animation-delay` to 2.5s to sync with carousel reveal

## Working Commit Reference
- **07a3552** - "new carousel" - Logo works, carousel works, no #418 errors
- **86b813d** - Above + CLS fix with fixed-height frame

## Red Herrings (things that weren't the problem)
- z-index values
- webp vs jpg format
- GPU acceleration hints
- display: block
- background: transparent vs #000

The logo wasn't showing because we'd accumulated too many CSS changes. The fix was resetting, not adding more changes.
