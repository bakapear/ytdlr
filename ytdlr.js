/* global fetch */

(() => {
  window.ytdlr = () => ytdlr()

  let util = {
    base: 'https://www.youtube.com',
    between: (str, a, b, c = 0, d = 0) => {
      if (a instanceof RegExp) a = str.match(a)[0]
      let x = str.indexOf(a)
      let y = str.indexOf(b, x)
      if (!b) y = str.length
      return str.substring(x + a.length + d, y + c)
    },
    text: x => (typeof x === 'string') ? x.replace(/\+/g, ' ') : x.simpleText || x.runs.map(x => x.text).join('')
  }

  async function ytdlr () {
    let match = window.location.href.match(/^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?.*?(?:v|list)=(.*?)(?:&|$)|^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?(?:(?!=).)*\/(.*)$/i)
    if (!match || !match[1]) return
    let id = match[1]

    let player = await getPlayerData()
    let data = await getVideoData(id, player.sts)
    let streams = Object.values(data.streamingData.adaptiveFormats)
    if (data.streamingData.formats) streams.push(...Object.values(data.streamingData.formats))
    let formats = decipherFormats(streams, player.fn)
    return formatResponse(data, formats)
  }

  async function getPlayerData () {
    let html = document.querySelector('head').innerHTML
    let data = JSON.parse(util.between(html, /window\.ytplayer.*?=.*?{};.*?ytcfg\.set\(/s, '})', 1))
    let player = await fetch(data.PLAYER_JS_URL, { base: util.base }).then(t => t.text())
    return {
      sts: data.STS,
      fn: getCipherFunction(player)
    }
  }

  function getCipherFunction (str) {
    let keys = ['a=a.split("")', '};', 'var ', '(', '=']
    let js = util.between(str, `${keys[0]};${keys[2]}`)
    let top = util.between(js, keys[0], keys[1], 1, -28)
    let fn = keys[2] + util.between(top, keys[0], keys[3], 10, 1).split('.')[0] + keys[4]
    let side = util.between(js, fn, keys[1], 2, -fn.length)
    return eval(side + top) // eslint-disable-line no-eval
  }

  async function getVideoData (id, sts, detail) {
    let url = new URL('get_video_info', util.base)
    let params = {
      video_id: id,
      eurl: 'https://youtube.googleapis.com/v/' + id,
      ps: 'default',
      gl: 'US',
      hl: 'en',
      el: detail ? 'detailpage' : 'embedded',
      sts: sts
    }
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    let body = await fetch(url).then(t => t.text())
    return parseData(body).player_response
  }

  function parseData (data) {
    let res = {}
    let part = (typeof data === 'object') ? Object.entries(data) : data.split('&').map(x => x.split('='))
    for (let i = 0; i < part.length; i++) {
      let key = part[i][0]
      let val = part[i][1]
      if (key === 'player_response') val = JSON.parse(decodeURIComponent(val))
      if (typeof val === 'object') val = parseData(val)
      res[key] = val
    }
    return res
  }

  function decipherFormats (data, fn) {
    data = Object.values(data)
    for (let i = 0; i < data.length; i++) {
      let item = data[i]
      if (item.mimeType) item.mimeType = item.mimeType.replace(/\+/g, ' ')
      if (item.signatureCipher) {
        let cipher = parseData(item.signatureCipher)
        delete item.signatureCipher
        item.url = `${decodeURIComponent(cipher.url)}&${cipher.sp}=${fn(decodeURIComponent(cipher.s))}`
      }
    }
    return data
  }

  function formatResponse (data, formats) {
    let details = data.videoDetails
    let micro = data.microformat.playerMicroformatRenderer
    let url = micro.ownerProfileUrl
    let regex = /(?<=codecs=").*(?=")/
    let video = {
      id: details.videoId,
      type: micro.isUnlisted ? 'unlisted' : 'public',
      title: util.text(micro.title).replace(/\+/g, ' '),
      description: micro.description ? util.text(micro.description).replace(/\+/g, ' ') : null,
      thumbnails: Object.values(details.thumbnail.thumbnails),
      date: micro.publishDate,
      duration: Number(details.lengthSeconds) * 1000,
      views: Number(details.viewCount),
      author: {
        id: details.channelId,
        vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : null,
        title: details.author.replace(/\+/g, ' ')
      }
    }
    formats = formats.map(x => {
      let parts = x.mimeType.split(';')
      return {
        itag: x.itag,
        url: x.url,
        mime: parts[0],
        codecs: parts[1].match(regex)[0].split(', '),
        quality: x.qualityLabel || x.audioQuality || null,
        stats: {
          width: x.width || null,
          height: x.height || null,
          bitrate: x.bitrate || null,
          samplerate: Number(x.audioSampleRate) || null,
          channels: x.audioChannels || null,
          size: Number(x.contentLength) || null,
          duration: Number(x.approxDurationMs) || null,
          fps: x.fps || null
        }
      }
    })
    return { info: video, formats: formats }
  }
})()
