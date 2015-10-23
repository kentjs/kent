var cookies = require('tiny-cookie')
  , compose = require('./util/compose')
  , parse = require('url').parse
  , resolve = require('url').resolve
  , ready = require('detect-dom-ready')
  , delegate = require('component-delegate')
  , serialize = require('form-serialize')

var Application = module.exports = function Application(options) {
	if (!(this instanceof Application)) 
		return new Application()

	this._stack = []
	this.options = options || {}
	this._supported = !!(window.history && window.history.pushState)
}

var app = Application.prototype

app.serve = function serve(directory, options) {
	throw new Error('app.serve() is only available on the server')
}

app.connect = function connect(fn) {
	throw new Error('app.connect() is only available on the server')
}

app.use = function use(fn) {
	if(fn._stack) this._stack.push.apply(this._stack, fn._stack)
	else this._stack.push(fn)
	return this
}

app.createLoadingIndicator = function createLoadingIndicator() {
	var indicator = document.createElement('div')
	  , style = document.createElement('style')
	  , head = document.head || document.getElementsByTagName('head')[0]

	var css = `
		#kent-loading-indicator {
			position:fixed;
			z-index: 2147483647;
			top: 0;
			left: -1px;
			width: 0;
			opacity: 0;
			height: 2px;
			background-color:${this.options.loadingColor || '#04beca'};
			box-shadow:0 0 3px ${this.options.loadingColor || '#04beca'};
			border-radius: 1px;
			-moz-transition: width 300ms ease-out,opacity 300ms linear;
			-webkit-transition: width 300ms ease-out,opacity 300ms linear;
			transition: width 300ms ease-out,opacity 300ms linear;
			-moz-transform: translateZ(0);
			-ms-transform: translateZ(0);
			-webkit-transform: translateZ(0);
			transform: translateZ(0);
			will-change: width,opacity;
		}
	`

	indicator.id = 'kent-loading-indicator'
	style.type = 'text/css';
	
	if(style.styleSheet) {
		style.styleSheet.cssText = css
	} else {
		style.appendChild(document.createTextNode(css))
	}

	head.appendChild(style)
	document.body.appendChild(indicator)
	this.loadingIndicator = indicator
}

app.startLoad = function startLoad() {
	var activity = () => {
		if(this._loading) {
			this.loadingIndicator.style.width = Math.min(99, this._loading++) + '%'
			setTimeout(activity, 200+Math.floor(Math.random()*300))
		}
	}

	this._loading = 15
	this.loadingIndicator.style.opacity = 1

	activity()
}

app.finishLoad = function finishLoad() {
	this._loading = 0
	this.loadingIndicator.style.width = '100%'
	setTimeout(() => this.loadingIndicator.style.opacity = 0, 100)
	setTimeout(() => this.loadingIndicator.style.width = 0, 400)
}

app.navigate = function navigate(url, body, redirect) {
	if(!this._supported) {
		if(redirect) return window.location.replace(url)
		else return window.location.href = url
	}

	var absoluteUrl = resolve(window.location.href, url)

	if(absoluteUrl.indexOf(window.location.host) == -1) return

	var ctx = createContext(absoluteUrl, body)

	if(ctx.host != window.location.host) {
		return false
	}

	this.startLoad()

	return new Promise((resolve, reject) => {
		ctx.complete = () => {
			if(ctx.status && ctx.status >= 300 && ctx.status < 400) {
				return resolve(this.navigate(ctx.redirect, undefined, redirect))
			}

			if(ctx.href != window.location.href) {
				window.scrollTo(0, 0)

				if(redirect) {
					window.history.replaceState({}, '', ctx.href)
				} else {
					window.history.pushState({}, '', ctx.href)
				}
			}

			this.finishLoad()
			resolve(ctx)
		}

		this._fn.call(ctx, (err) => {
			if(err) {
				console.error(err.stack)
				this.finishLoad()
				reject(err)
			}
		})()
	})
}

app.submit = function submit(form) {
	if(!this._supported) {
		return form.submit()
	}

	var originalUrl = window.location.href
	  , url = form.action
	  , body

	if(form.method.toUpperCase() == 'POST') {
		body = serialize(form, { hash:true })
	} else {
		url += (form.action.indexOf('?') == -1 ? '?' : '&') + serialize(form)
	}

	return this.navigate(url, body)
}

app.redirect = function redirect(url) {
	return this.navigate(url, undefined, true)
}

app.refresh = function refresh() {
	return this.redirect(window.location.href)
}

app.start = function listen() {
	if(!this._supported) return

	this._fn = compose(this._stack)
	
	ready(() => {
		delgateFromDocument('a[href]', 'click', (e) => {
			var isLeftClick = !e.buttons || e.buttons & 1
			
			if(isLeftClick && this.navigate(e.delegateTarget.href)) {
				e.stopPropagation()
				e.preventDefault()
				return false
			}
		})
		delgateFromDocument('form[action]', 'submit', (e) => {
			if(this.submit(e.delegateTarget)) {
				e.stopPropagation()
				e.preventDefault()
				return false
			}
		})
	})

	this.createLoadingIndicator()

	window.addEventListener('popstate', (e) => {
		if('state' in window.history && window.history.state !== null) {
			this.refresh().then(() => console.log('complete')).catch(() => console.log('error'))
		}
	})

	window.history.replaceState({}, '', window.location.href)
}

function delgateFromDocument(selector, event, handler) {
	delegate.bind(document, selector, event, function(e) {
		if(!e.defaultPrevented) {
			return handler(e)
		}
	})
}

function createContext(url, body) {
	var ctx = {
		body,
		cookies,
		redirect:function(url) {
			this.status = 302
			this.redirect = url
			this.complete()
		},
		params:{}
	}

	var parsedUrl = parse(url, true)
	ctx.url = parsedUrl.path
	ctx.path = parsedUrl.pathname
	ctx.query = parsedUrl.query
	ctx.host = parsedUrl.host
	ctx.site = parsedUrl.protocol+(parsedUrl.slashes ? '//' : '')+parsedUrl.host
	ctx.href = parsedUrl.href

	return ctx
}