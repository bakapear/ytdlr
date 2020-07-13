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
      "mimeType": "video/mp4; codecs=\"avc1.42001E, mp4a.40.2\"",
      "bitrate": 873878,
      "width": 640,
      "height": 360,
      "lastModified": "1594421510546754",
      "contentLength": "4289735310",
      "quality": "360p",
      "fps": 30,
      "qualityLabel": "360p",
      "projectionType": "RECTANGULAR",
      "averageBitrate": 873877,
      "audioQuality": "AUDIO_QUALITY_LOW",
      "approxDurationMs": "39270817",
      "audioSampleRate": "44100",
      "audioChannels": 2,
      "url": "https://r3---sn-4g5ednsy.googlevideo.com/videoplayback?expire=1594688505...",
      "mime": "video/mp4",
      "codecs": [
        "avc1.42001E",
        "mp4a.40.2"
      ],
      "size": 4289735310,
      "duration": 39270817,
      "samplerate": 44100,
      "channels": 2
    }, 
    {...}, {...}, ...
  ]
}
*/
})
