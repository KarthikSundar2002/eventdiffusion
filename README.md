# EventDiffusion: Learning Native Event Stream Distribution from Videos

**Project page: https://eventdiffusion.karthiksundar.in/** · **Paper: https://arxiv.org/abs/2611.33096**

Karthik Sundar Senthilkumar, Christopher Thirgood, Simon Hadfield

EventDiffusion learns the distribution of native, asynchronous event streams from real event-camera recordings. It
generates individual events (pixel, polarity, continuous timestamp) between RGB frames, and forecasts them beyond the
last frame.

This repository holds the project page only: a static site (`index.html` and `assets/`) with no build step. The code will be
linked from the page.

## Viewing locally

Open `index.html` in a browser, or run `python3 serve.py` and open http://127.0.0.1:8000/. That serves with browser
caching off, and with the byte ranges that video seeking needs.

## Data

The clips show recordings from the DSEC, EDS, BS-ERGB and CEAR datasets, and event streams generated from them. The
recordings belong to their authors; see the paper for the references.

## Citation

```bibtex
@article{senthilkumar2026eventdiffusion,
  title   = {EventDiffusion: Learning Native Event Stream Distribution from Videos},
  author  = {Senthilkumar, Karthik Sundar and Thirgood, Christopher and Hadfield, Simon},
  journal = {arXiv preprint arXiv:2611.33096},
  year    = {2026}
}
```
