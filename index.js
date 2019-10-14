module.exports = main

let m = {
  https: require('https'),
  http: require('http'),
  url: require('url')
}

let base = 'https://www.youtube.com/'

function get (url, opts = {}) {
  if (!url) throw new Error('No URL specified.')
  if (opts.query) {
    let parts = ''
    for (let prop in opts.query) parts += `&${prop}=${encodeURIComponent(opts.query[prop])}`
    if (url.indexOf('?') === -1) parts = '?' + parts.substr(1)
    url += parts
  }
  return new Promise((resolve, reject) => {
    let link = new m.url.URL(url)
    let lib = link.protocol === 'https:' ? m.https : m.http
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
  })
}

async function main (link, next) {
  let id = await formatId(link)
  let info = await getPlayerData(id)
  let data = await getVideoData(id, info.sts)
  if (!data.player_response || !data.player_response.videoDetails) {
    data = { status: 'fail', errorcode: 2, reason: 'Invalid parameters.' }
  }
  if (data.status !== 'ok') {
    data.reason = decodeStr(data.reason)
    if (!next) throw new Error(data.reason)
    else next(data, null)
  } else {
    let res = formatResponse(data, info.fn)
    if (!next) return res
    else next(null, res)
  }
}

async function formatId (link) {
  let match = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i)
  return match ? match[1] : null
}

function decodeStr (str) {
  return str.replace(/\+/g, ' ')
}

function formatResponse (data, fn) {
  let details = data.player_response.videoDetails
  let res = {
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
  if (data.adaptive_fmts) res.formats.push(data.adaptive_fmts)
  res.formats = res.formats.map(x => {
    if (x.s) x.url += `&${x.sp}=` + fn(x.s)

    if (x.mimeType) x.mimeType = decodeStr(x.mimeType)
    else if (x.type) x.type = decodeStr(x.type)
    if (x.s) delete x.s
    if (x.sp) delete x.sp
    return x
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

async function getPlayerUrl (id) {
  let url = base + 'embed/' + id
  let { body } = await get(url, { headers: { 'accept-language': 'en_US' } })
  return base + body.substring(body.indexOf('yts/jsbin/player'), body.indexOf('base.js') + 7)
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

async function getVideoData (id, sts) {
  let data = await getVideoInfo(id, sts)
  data = parseData(data)
  return data
}

async function getVideoInfo (id, sts) {
  let url = base + 'get_video_info'
  let { body } = await get(url, {
    query: {
      video_id: id,
      eurl: 'https://youtube.googleapis.com/v/' + id,
      ps: 'default',
      gl: 'US',
      hl: 'en',
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
