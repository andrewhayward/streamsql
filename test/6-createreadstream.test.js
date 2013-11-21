const test = require('tap').test
const useDb = require('./testdb')
const concat = require('concat-stream')

const tables = ['user', 'user-data', 'book', 'story', 'review']

test('table.createReadStream: basic', function (t) {
  useDb(t, tables, function (db, done) {
    const book = makeBookDb(db)
    const rs = book.createReadStream()
    rs.pipe(concat(function (streamRows) {
      book.get(function (err, getRows) {
        t.same(getRows, streamRows, 'should get the same rows')
        t.end()
      })
    }))
    rs.on('error', function (err) {
      t.fail('should not have an error')
      throw err
    })
  })
})

test('table.createReadStream: relationships', function (t) {
  useDb(t, tables, function (db, done) {
    const user = makeUserDb(db)
    const book = makeBookDb(db)
    const story = makeStoryDb(db)
    const review = makeReviewDb(db)

    const bookStream = book.createReadStream({}, {
      relationships: true,
    }).pipe(concat(function (rows) {
      const first = rows[0]
      t.same(first.authorFullName(), first.author.fullName(), 'should have right methods')
      t.same(first.author.fullName(), 'George Saunders', 'should have right author')
      t.same(first.stories.length, 7, 'should have seven stories')
      t.same(first.stories[0].reverse(), 'enilceD daB ni dnaLraWliviC', 'should have methods on hasMany')
      t.end()
    }))
  })
})

test('table.createReadStream: limits and pages', function (t) {
  useDb(t, tables, function (db, done) {
    const book = makeBookDb(db)

    book.createReadStream({}, {
      limit: 1,
      page: 2,
      debug: true,
    })
      .pipe(concat(function (data) {
        t.same(data.length, 1)
        t.same(data[0].title, 'Pastoralia')
        t.end()
      }))
  })
})


function makeUserDb(db) {
  return db.table('user', {
    fields: [
      'id',
      'first_name',
      'last_name'
    ],
    methods: {
      fullName: function authorFullName() {
        return [this.first_name, this.last_name].join(' ')
      }
    },
  })
}
function makeStoryDb(db) {
  return db.table('story', {
    fields: [
      'id',
      'book_id',
      'title',
    ],
    methods: {
      reverse: function reverse() {
        return this.title.split('').reverse().join('')
      }
    }
  })
}
function makeReviewDb(db) {
  return db.table('review', {
    fields: ['id', 'book_id', 'link']
  })
}
function makeBookDb(db) {
  return db.table('book', {
    fields: [
      'id',
      'author_id',
      'title',
      'release_date'
    ],
    relationships: {
      author: {
        type: 'hasOne',
        table: 'user',
        from: 'author_id',
        foreign: 'id',
      },
      stories: {
        type: 'hasMany',
        table: 'story',
        from: 'id',
        foreign: 'book_id',
        optional: true,
      },

      /* multiple hasMany relationships are broken right now – might
         need a different strategy */

      // review: {
      //   type: 'hasMany',
      //   table: 'review',
      //   from: 'id',
      //   foreign: 'book_id',
      //   optional: true,
      // },
    },
    methods: {
      authorFullName: function authorFullName() {
        const author = this.author
        return [author.first_name, author.last_name].join(' ')
      }
    },
  })
}
