module.exports = function compose(middleware) {
  return function (next, onErr) {
  	next = next || noop
    var i = middleware.length
    while (i--) next = nextify(middleware[i], this, next)
    return next
  }
}

function nextify(fn, ctx, next) {
	return function(err) {
		if(err) return next(err)
		
		try {
			fn.call(ctx, next)
		} catch(err) {
			next(err)
		}
	}
}

function noop(){}