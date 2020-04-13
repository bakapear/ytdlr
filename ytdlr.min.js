/* global fetch */
(function () {
  window.ytdlr = url => main(url)

  let util = {
    base: 'https://www.youtube.com',
    sub: (x, y, z = 0, a, b = 0) => x.substring(x.indexOf(y) + z, x.indexOf(a, x.indexOf(y) + z) + b),
    hmsToMs: x => {
      let r = 0
      x = x.split(':').reverse()
      if (x[0]) r += x[0] * 1000
      if (x[1]) r += x[1] * 60000
      if (x[2]) r += x[2] * 3600000
      return r
    },
    msToHms: x => {
      let t = new Date(x).toISOString().substr(11, 8).split(':')
      let h = Math.floor(x / 1000 / 60 / 60).toString()
      if (h > 23) t[0] = h
      while (t.length > 2 && t[0] === '00' && t[1].startsWith('0')) {
        t.shift()
      }
      if (t.length > 2 && t[0] === '00') t.shift()
      if (t[0].startsWith('0')) t[0] = t[0].substr(1)
      return t.join(':')
    },
    formatId: x => {
      let match = x.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/i)
      return match ? match[1] : x
    },
    getThumb: x => x.indexOf('hqdefault') >= 0 ? `https://i3.ytimg.com/vi/${x.match(/vi\/(.*?)\//)[1]}/mqdefault.jpg` : x,
    formatStat: (x, y) => Number(x.substr(0, x.indexOf(y)).trim().replace(/,/g, '')),
    decodeStr: (x = '') => x.replace(/\+/g, ' ')
  }

  function get (url, opts = {}) {
    if (opts.query) {
      let parts = ''
      for (let prop in opts.query) parts += `&${prop}=${encodeURIComponent(opts.query[prop])}`
      if (url.indexOf('?') === -1) parts = '?' + parts.substr(1)
      url += parts
    }
    let out = fetch(url, { headers: opts.headers })
    out.text = () => Promise.resolve(out).then(p => p.text())
    return out
  }

  async function main (link = window.location.href) {
    let id = util.formatId(link)
    let info = await getPlayerData(id)
    let data = await getVideoData(id, info.sts)
    return formatResponse(data, info.fn)
  }

  function formatResponse (data, fn) {
    let details = data.player_response.videoDetails
    let res = {
      error: util.decodeStr(data.player_response.playabilityStatus.reason),
      videoId: details.videoId,
      channelId: details.channelId,
      title: util.decodeStr(details.title),
      description: util.decodeStr(details.shortDescription),
      author: util.decodeStr(details.author),
      keywords: details.keywords ? details.keywords.map(x => util.decodeStr(x)) : [],
      viewCount: details.viewCount,
      isPrivate: details.isPrivate,
      isLiveContent: details.isLiveContent,
      allowRatings: details.allowRatings,
      isOwnerViewing: details.isOwnerViewing,
      averageRating: details.averageRating,
      thumbnails: details.thumbnail.thumbnails,
      duration: details.lengthSeconds * 1000,
      formats: data.player_response.streamingData ? data.player_response.streamingData.formats : []
    }
    if (!res.error) delete res.error
    res.formats = res.formats.map(x => {
      if (x.s) x.url += `&${x.sp}=` + fn(x.s)
      x.mimeType = util.decodeStr(x.mimeType)
      let res = {
        itag: x.itag,
        format: x.mimeType.split(';')[0].split('/')[1],
        type: x.width && x.audioQuality ? 'video/audio' : x.width ? 'video' : x.audioQuality ? 'audio' : null,
        codecs: x.mimeType.match(/codecs="(.*?)"/)[1].split(',').map(x => x.trim())
      }
      if (x.contentLength) res.size = x.contentLength
      if (x.approxDurationMs) res.duration = x.approxDurationMs
      if (res.type.indexOf('video') >= 0) {
        if (x.qualityLabel) res.quality = x.qualityLabel
        if (x.width && x.height) res.dimension = `${x.width}x${x.height}`
        if (x.bitrate) res.bitrate = x.bitrate.toString()
      }
      if (res.type.indexOf('audio') >= 0) {
        if (x.audioSampleRate) res.samplerate = x.audioSampleRate
      }
      res.url = x.url
      return res
    })
    return res
  }

  async function getPlayerData (id) {
    let url = await getPlayerUrl(id)
    let body = await get(url).text()
    return {
      sts: util.sub(body, ',sts:', 5, ','),
      fn: findCipherFunctions(body)
    }
  }

  async function getPlayerUrl (id, retries = 3) {
    let body = await get('watch', {
      base: util.base,
      query: {
        v: id,
        hl: 'en',
        bpctr: Math.ceil(Date.now() / 1000)
      }
    }).text()
    let url = util.base + util.sub(body, '/s/player/', 0, 'base.js', 7)
    if (url.indexOf('/s/player/') < 0) {
      if (retries < 0) throw new Error('Could not retrieve player url!')
      url = await getPlayerUrl(id, --retries)
    }
    return url
  }

  function findCipherFunctions (js) {
    js = js.substr(js.indexOf('a=a.split("");var') + 1)
    let top = util.sub(js, 'a=a.split("")', -15, '};', 1)
    let side = util.sub(js, `var ${util.sub(top, 'a=a.split("")', 14, '(').split('.')[0]}`, 0, '};', 2)
    return eval(side + top) // eslint-disable-line no-eval
  }

  async function getVideoData (id, sts, detail) {
    if (sts === 'f') sts = ''
    let data = await getVideoInfo(id, sts, detail)
    data = parseData(data)
    if (data.status !== 'ok') throw new Error(util.decodeStr(data.reason))
    if (!detail && !data.player_response.streamingData) data = await getVideoData(id, sts, true)
    return data
  }

  async function getVideoInfo (id, sts, detail) {
    let body = await get('get_video_info', {
      base: util.base,
      query: {
        video_id: id,
        eurl: 'https://youtube.googleapis.com/v/' + id,
        ps: 'default',
        gl: 'US',
        hl: 'en',
        el: detail ? 'detailpage' : 'embedded',
        sts: sts
      }
    }).text()
    return body
  }

  function parseData (str) {
    let data = {}
    str.split('&').forEach(x => {
      let key = x.substr(0, x.indexOf('='))
      let value = x.substr(x.indexOf('=') + 1)
      value = decodeURIComponent(value)
      if (key === 'player_response') value = JSON.parse(value)
      if (value.constructor === String) {
        if (value.indexOf('&') >= 0 && key !== 'url' && key !== 'shortDescription') value = parseData(value)
        else if (value.indexOf(',') >= 0) value = value.split(',')
        else if (value === 'true') value = true
        else if (value === 'false') value = false
        else if (!isNaN(value)) value = Number(value)
      }
      data[key] = value
    })
    if (data && data.player_response && data.player_response.streamingData) {
      if (data.player_response.streamingData && data.player_response.streamingData.adaptiveFormats) {
        data.player_response.streamingData.formats.push(...data.player_response.streamingData.adaptiveFormats)
      }
      data.player_response.streamingData.formats = data.player_response.streamingData.formats.map(x => {
        if (x.cipher) {
          let data = parseData(x.cipher)
          delete x.cipher
          return { ...x, ...data }
        }
        return x
      })
    }
    return data
  }
})()
