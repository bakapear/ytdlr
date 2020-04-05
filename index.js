/* global fetch, ytdlr:writable */
(function () {
  ytdlr = async (link, opts, next) => main(link, opts, next)

  let mod = null
  let base = 'https://cors-anywhere.herokuapp.com/https://www.youtube.com/'
  if (typeof window === 'undefined') {
    module.exports = ytdlr
    mod = {
      https: require('https'),
      http: require('http'),
      url: require('url')
    }
    base = 'https://www.youtube.com/'
  } else if (window.location.href.match(/(https?:\/\/)?(www\.youtube\.com|youtu\.?be)/)) {
    base = ''
  }

  async function main (link) {
    link = link || ''
    let id = await formatId(link)
    let info = await getPlayerData(id)
    let data = await getVideoData(id, info.sts)
    return formatResponse(data, info.fn)
  }

  function get (url, opts = {}) {
    if (!url) throw new Error('No URL specified.')
    if (opts.query) {
      let parts = ''
      for (let prop in opts.query) parts += `&${prop}=${encodeURIComponent(opts.query[prop])}`
      if (url.indexOf('?') === -1) parts = '?' + parts.substr(1)
      url += parts
    }
    return new Promise((resolve, reject) => {
      if (mod === null) {
        let res = fetch(url, { headers: opts.headers })
        if (opts.json) {
          try {
            res = res.then(j => j.json())
          } catch (e) { reject(e) }
        } else {
          res = res.then(t => t.text())
        }
        res.then(r => resolve({ body: r }))
      } else {
        let link = new mod.url.URL(url)
        let lib = link.protocol === 'https:' ? mod.https : mod.http
        lib.get(link, { headers: opts.headers }, res => {
          let data = ''
          res.on('data', chunk => { data += chunk })
          res.on('end', () => {
            if (opts.json) {
              try {
                data = JSON.parse(data)
              } catch (e) { reject(e) }
            }
            resolve({ ...res, body: data })
          })
          res.on('error', e => reject(e))
        })
      }
    })
  }

  function formatId (link) {
    let match = link.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/i)
    return match ? match[1] : link
  }

  function decodeStr (str) {
    if (str) return str.replace(/\+/g, ' ')
  }

  function formatResponse (data, fn) {
    let details = data.player_response.videoDetails
    let res = {
      error: decodeStr(data.player_response.playabilityStatus.reason),
      videoId: details.videoId,
      channelId: details.channelId,
      title: decodeStr(details.title),
      description: decodeStr(details.shortDescription),
      author: decodeStr(details.author),
      keywords: details.keywords ? details.keywords.map(x => decodeStr(x)) : [],
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
    res.formats = res.formats.map(x => {
      x.mimeType = decodeStr(x.mimeType)
      let res = {
        itag: x.itag,
        format: x.mimeType.split(';')[0].split('/')[1],
        type: x.width && x.audioQuality ? 'video/audio' : x.width ? 'video' : x.audioQuality ? 'audio' : null,
        codecs: x.mimeType.match(/codecs="(.*?)"/)[1].split(',').map(x => x.trim())
      }
      if (res.format === 'mp4' && res.type === 'audio') res.format = 'm4a'
      if (x.s) {
        if (fn) res.url = `${x.url}&${x.sp}=` + fn(x.s)
        else {
          res.url = x.url
          res.sig = x.s
        }
      } else res.url = x.url
      if (x.contentLength) res.size = x.contentLength
      if (x.approxDurationMs) res.duration = x.approxDurationMs
      if (x.bitrate) res.bitrate = x.bitrate.toString()
      if (res.type.indexOf('video') >= 0) {
        if (x.qualityLabel) res.quality = x.qualityLabel
        if (x.width && x.height) res.dimension = `${x.width}x${x.height}`
      }
      if (res.type.indexOf('audio') >= 0) {
        if (!res.quality && x.audioQuality) res.quality = x.audioQuality
        if (x.audioSampleRate) res.samplerate = x.audioSampleRate
      }
      return res
    })
    return res
  }

  async function getPlayerData (id) {
    let url = await getPlayerUrl(id)
    let { body } = await get(url)
    return {
      sts: findSTS(body),
      fn: findCipherFunctions(body)
    }
  }

  async function getPlayerUrl (id, retries = 3) {
    let { body } = await get(base + 'watch', {
      query: {
        v: id,
        hl: 'en',
        bpctr: Math.ceil(Date.now() / 1000)
      }
    })
    let url = base + body.substring(body.indexOf('yts/jsbin/player'), body.indexOf('base.js') + 7)
    if (url.indexOf('/yts/jsbin/player') < 0) {
      if (retries < 0) throw new Error('Could not retrieve player url!')
      url = await getPlayerUrl(id, --retries)
    }
    return url
  }

  function findSTS (js) {
    let pointer = js.indexOf(',sts:') + 5
    return js.substring(pointer, js.indexOf(',', pointer))
  }

  function findCipherFunctions (js) {
    let top = getOuterFnStr(js)
    let side = getInnerFnStr(js, top)
    return eval(side + top) // eslint-disable-line no-eval

    function getOuterFnStr (js) {
      let pointer = js.indexOf('a=a.split("")')
      return js.substring(pointer - 15, js.indexOf('};', pointer) + 1)
    }

    function getInnerFnStr (js, top) {
      let pointer = top.indexOf('a=a.split("")') + 14
      let name = top.substring(pointer, top.indexOf('(', pointer)).split('.')[0]
      pointer = js.indexOf(`var ${name}`)
      return js.substring(pointer, js.indexOf('};', pointer) + 2)
    }
  }

  async function getVideoData (id, sts, detail) {
    if (sts === 'f') sts = ''
    let data = await getVideoInfo(id, sts)
    data = parseData(data)
    if (data.status !== 'ok') throw new Error(decodeStr(data.reason))
    if (!detail && !data.player_response.streamingData) data = await getVideoData(id, sts, true)
    return data
  }

  async function getVideoInfo (id, sts, detail) {
    let { body } = await get(base + 'get_video_info', {
      query: {
        video_id: id,
        eurl: 'https://youtube.googleapis.com/v/' + id,
        ps: 'default',
        gl: 'US',
        hl: 'en',
        el: detail ? 'detailpage' : 'embedded',
        sts: sts
      }
    })
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
