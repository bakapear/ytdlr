# ytdlr
Kind of a lite version of [ytdl-core](https://www.npmjs.com/package/ytdl-core) <br>
Lightweight and uses no external dependencies.

This package has been rewritten and now only works on the youtube site. <br>
Use [ytt.download](https://www.npmjs.com/package/ytt) for a server-side solution.

```js
await ytdlr()
/*
{
  "info": {
    "id": "b6BgRnzAlVA",
    "type": "public",
    "title": "JET SET RADIO 7/6 ENCORE BROADCAST - Jet Set Radio Evolution",
    "description": "For one last time, make some noise... cause this [...]",
    "thumbnails": [
      {
        "url": "https://i.ytimg.com/vi/b6BgRnzAlVA/hqdefault.jpg?sqp=-oaymwEYCKgBEF5IVfKriqkDCwgBFQAAiEIYAXAB&rs=AOn4CLAJJH3WEAbDMdlEThm0vOZ9osg3bw",
        "width": 168,
        "height": 94
      }, 
      {...}, {...}, ...
    ],
    "date": "2020-07-06",
    "duration": 39271000,
    "views": 66768,
    "author": {
      "id": "UC9ecwl3FTG66jIKA9JRDtmg",
      "vanity": null,
      "title": "SiIvaGunner"
    }
  },
  "formats": [
    {
      "itag": 18,
      "url": "https://r3---sn-5hnekn7k.googlevideo.com/videoplayback?expire=1596753996&ei=7DMsX_zmMZmu7gP7oojoCg&ip=94.31.85.199&id=o-ANCw0LOum1ckxR0DBOUwPgP8hIYsf3n88xBkwsMIQeyO&itag=18&source=youtube&requiressl=yes&mh=Uz&mm=31%2C26&mn=sn-5hnekn7k%2Csn-4g5ednsy&ms=au%2Conr&mv=m&mvi=3&pl=18&gcr=de&initcwndbps=2091250&vprv=1&mime=video%2Fmp4&gir=yes&clen=4289735310&ratebypass=yes&dur=39270.817&lmt=1594421510546754&mt=1596732275&fvip=3&fexp=23883098&beids=9466588&c=WEB&txp=5431432&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cgcr%2Cvprv%2Cmime%2Cgir%2Cclen%2Cratebypass%2Cdur%2Clmt&lsparams=mh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=AG3C_xAwRgIhANl-aKE0yHknsAuyeCqRWVCIQKxN2JQHbACvkKBxuDFRAiEAlFPVy116YkIOfFNDheIo8LKp1FAXXH0PMjfG2K817yw%3D&sig=AOq0QJ8wRgIhAKQnmKdSgjX7N9GbCUguxBW-HCj1DVmlMk4zTm7_3WCNAiEA5e_YRMJbS-ZgNLY_o0OAHlz3WmfvVbG2Q95QDlkRvp8=",
      "mime": "video/mp4",
      "codecs": [
        "avc1.42001E",
        "mp4a.40.2"
      ],
      "quality": "360p",
      "stats": {
        "width": 640,
        "height": 360,
        "bitrate": 873878,
        "samplerate": 44100,
        "channels": 2,
        "size": 4289735310,
        "duration": 39270817,
        "fps": 30
      }
    }, 
    {...}, {...}, ...
  ]
}
*/
})
