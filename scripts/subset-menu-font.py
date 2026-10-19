"""Build the OFL round label subset from the verified upstream font.
Temporary tools: fonttools==4.60.2 brotli==1.2.0 skia-pathops==0.8.0.post2.
Usage: python scripts/subset-menu-font.py /path/to/ChillRoundF-v3.ttf
"""
import hashlib
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.ttLib.removeOverlaps import removeOverlaps

source = Path(sys.argv[1])
data = source.read_bytes()
assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == '4f7c5af27a6ef15edadf53aec804de7d157a9181', 'Unexpected upstream font'
text = '今日放题我的寿司手帐大胃王常驻百味一测秋小食堂欢迎光临，今天想吃点什么？'
font = TTFont(source)
assert not set(text)-set(map(chr,font.getBestCmap())), 'Missing display glyphs'
# The upstream RFN belongs to the original font; name this derived subset separately.
for name in font['name'].names:
    if name.nameID in (1,4,6,16):
        value = 'SushiRoundLabels-Regular' if name.nameID == 6 else 'Sushi Round Labels'
        name.string = value.encode(name.getEncoding())
    if name.nameID in (2,17):
        name.string = 'Regular'.encode(name.getEncoding())
options = subset.Options()
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
# Merge overlapping strokes to avoid thin knockout seams in small browser labels.
removeOverlaps(font, removeHinting=True)
font.flavor = 'woff2'
font.save(Path(__file__).resolve().parents[1] / 'assets/fonts/sushi-menu.woff2')
