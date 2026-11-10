#!/usr/bin/env python3
"""Create small web covers from identified developers' Drive presentations.

Only local cover JPEGs are committed, never source brochures. Each source
belongs to the matching project; the selected page depicts its exterior.
"""
import os
import subprocess
import tempfile
from pathlib import Path

import fitz
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets"/"project-covers"
OUT.mkdir(parents=True,exist_ok=True)

# (Atlas project id, Google Drive source file id, 0-based source page index, media type)
PROJECTS=[
 ("purita-phuket-bangtao","1SAmmGb3Ks41aca8ZYmCSMZ6pZpch4tOS",5,"pdf"),
 ("layan-verde","1-wGwHZFFOXw2iVI0Lj5zCWnMNh6zrzCZ",11,"pdf"),
 ("layan-green-park","1CnM5dbt3-Rfg-K_GkikdGMNcOGvNJAfa",0,"image"),
 ("bamboo-forest","1hsbOk7md2VjulkOl7NCRJhpRVDUJ_bkS",24,"pdf"),
 ("sudara-residences","14eZYZH1mpy0wv3QtNgaDPoqZnQjojQSO",12,"pdf"),
 ("manor","12a7MNaqFpvPlSwr10i0CelFs0BU9dKbv",10,"pdf"),
 ("mori","1g9qm8GxDDim03r4c6Acby8niL19hnioY",11,"pdf"),
 ("skypark-celeste","13PpqQFai-ylY0MCLUpK2ec1UG2rHJPmA",0,"pdf"),
 ("laguna-lake-residences-aster","1e7837mQw8YtaV01SIwTpcwnFC8upZsmr",1,"pdf"),
 ("laguna-beach-residences-bayside","1H83rjy7_86dvULX2Tzx8jHO6I02Atgjd",3,"pdf"),
 ("laguna-beach-residences-reef","1uktrAUE7TvS4Vc9lFsk2fthuqk-bVWQu",7,"pdf"),
 ("laguna-beach-residences-seashore","1S8FlZfZxpNBm-nXrYZiReo1gARkoeGnM",5,"pdf"),
 ("laguna-lakelands-waterfront-villas","1QRgYh5bvG6Ocuzt0FMU9QhG5vjTbHlGm",1,"pdf"),
 ("bellaguna-golf-residences","1_9QRC9dLxjyAdSrJGUe_aQNrNFQ9FNZo",4,"pdf"),
 ("bellaguna-lake-residences-lotus","10O3iHqVFKz29qTDiVvANAghzun1s3um4",3,"pdf"),
 ("skypark-elara","1irT9_Pgnot6t713n01biWs9nZ6-XKMLT",2,"pdf"),
 ("residences-at-garrya-phuket","1n1dpy8zmROra8TVVulyWK70lrMavNh6N",9,"pdf"),
 ("angsana-golf-residences-topaz","1aLF-N5zzBFWc30jAXHSvXiLtF8VH3IOW",4,"pdf"),
 ("clover-residence","1efPoXkdzIJ9nBORB3oVPWPEnDw6goXwv",10,"pdf"),
 ("mona","1_uYeveq3E_uIrVfKClmbr7Z3sbH2wgiY",8,"pdf"),
 ("mori-the-valley","19hVXyjoQ0_TX1Uqoh_cC9EwL0uxBFBNs",0,"pdf"),
 ("laguna-lakelands-waterside-residences","1k7S-S89MGBgpKj69VfOqt3aPuPWs0uFe",2,"pdf"),
 ("angsana-oceanview-residences","1iQRTnvvreROylHRJ58qKzLEYtMvodvPn",1,"pdf"),
 ("banyan-tree-lake-residences-yara","1TMjyWftPLf95-eSizeWITiaaA_pO0CBI",3,"pdf"),
 ("banyan-tree-beach-residences-mazu","1FCu1j4K7DDPe7DlaWrj19zTOCapX1t_2",2,"pdf"),
 ("banyan-tree-beach-residences-nammu","11OsvqT1nCnJCuR_G8h6dsuZL9JwziSmI",6,"pdf"),
 ("banyan-tree-beach-residences-nerea","1omgeRL1NNMNT7yo11xxCGNXTTV6sX38R",3,"pdf"),
 ("banyan-tree-beach-residences-varuna","1sI1vWvokcoEWvdcyKhBg4NZGdoB6bI9T",10,"pdf"),
 ("banyan-tree-beach-residences-oceanus","1od5IU3H18jj9OLZDQAfASaz6LHYJbz4z",2,"pdf"),
 ("banyan-tree-beach-residences-sirena","1L8brYhd4ZUHSj-wH0WFMVql0540MNndJ",3,"pdf"),
 ("angsana-beachfront","1pnAieGvO0ho1oFWonZekJuYhZXmc1D5M",2,"pdf"),
 ("sri-panwa-lagoon","1WgWq_DOt5wXnZn7v1Cw-RwX5b_NsMYq1",0,"image"),
]

def convert(path, media_type, page):
    if media_type=="image":
        with Image.open(path) as source:
            return source.convert("RGB")
    with fitz.open(path) as doc:
        pg=doc[page]
        pix=pg.get_pixmap(matrix=fitz.Matrix(1.65,1.65),alpha=False)
        return Image.frombytes("RGB",(pix.width,pix.height),pix.samples)

def main():
    successes=[]
    failures=[]
    with tempfile.TemporaryDirectory() as tmp:
        for slug,file_id,page,media_type in PROJECTS:
            if (OUT/(slug+".jpg")).is_file():
                print("EXISTS",slug,flush=True)
                continue
            target=Path(tmp)/(slug+(".pdf" if media_type=="pdf" else ".jpg"))
            try:
                subprocess.run(["gdown",file_id,"-O",str(target)],
                               check=True,timeout=120,stdout=subprocess.DEVNULL)
                if target.stat().st_size<30000:
                    raise RuntimeError("source file too small")
                img=convert(target,media_type,page)
                # Presentation page itself establishes provenance. Crop to wide hero.
                img=ImageOps.fit(img,(1200,675),Image.Resampling.LANCZOS,centering=(.5,.5))
                destination=OUT/(slug+".jpg")
                img.save(destination,"JPEG",quality=84,optimize=True,progressive=True)
                print("OK",slug,destination.stat().st_size,flush=True)
                successes.append(slug)
            except Exception as exc:
                failures.append(slug)
                print("SKIP",slug,type(exc).__name__,str(exc)[:170],flush=True)
    print("Created",len(successes),"project photos; unavailable",failures,flush=True)

if __name__=="__main__":
    main()
