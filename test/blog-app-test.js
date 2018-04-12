'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the expect syntax available throughout
// this module
const expect = chai.expect;

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);


function seedBlogPostData() {
    console.info('seeding BlogPost data');
    const seedData = [];

    for (let i = 1; i <= 10; i++) {
        seedData.push(generateBlogPostData());
    }
    // this will return a promise
    return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
    return { 
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.word(),
        content: faker.lorem.sentences(),
        date: faker.date.past()
    }
}


function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}


describe('BlogPosts API resource', function () {

    // we need each of these hook functions to return a promise
    // otherwise we'd need to call a `done` callback. `runServer`,
    // `seedBlogPostData` and `tearDownDb` each return a promise,
    // so we return the value returned by these function calls.
    before(function () {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function () {
        return seedBlogPostData();
    });

    afterEach(function () {
        return tearDownDb();
    });

    after(function () {
        return closeServer();
    });

    // note the use of nested `describe` blocks.
    // this allows us to make clearer, more discrete tests that focus
    // on proving something small
    describe('GET endpoint', function () {

        it('should return all existing blogposts', function () {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function (_res) {
                    res = _res
                    console.log('this is FIRST res.body: ', res.body)
                    console.log('this is res.body[0]: ', res.body[0])
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('array');
                    expect(res.body[0]).to.have.all.keys("title", "content", "author", "created", "id")
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                }).then(function(count) {
                    console.log('this is SECOND res.body:', res.body)
                    console.log('this is count:', count)
                    expect(res.body).to.have.lengthOf(count);
                })
        });
    });


    describe('POST endpoint', function() {

        const newPost = generateBlogPostData()

        it('should add a new blog post', function() {
            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    console.log('THIS IS POST res.body:', res.body)
                    expect(res.body.title).to.equal(newPost.title);
                    expect(res.body.content).to.equal(newPost.content);
                })
        });
    }); 


    describe('PUT endpoint', function () {

        // strategy:
        //  1. Get an existing post from db
        //  2. Make a PUT request to update that post
        //  3. Prove post returned by request contains data we sent
        //  4. Prove post in db is correctly updated
        it('should update fields you send over', function () {
            const updateData = {
                title: 'Updated BlogPost',
                content: 'This is the UPDATED content'
            };

            return BlogPost
                .findOne()
                .then(function (post) {
                    updateData.id = post.id;

                // make request then inspect it to make sure it reflects
                // data we sent
                return chai.request(app)
                    .put(`/posts/${post.id}`)
                    .send(updateData);
                })
                .then(function (res) {
                    expect(res).to.have.status(204);
                    
                    return BlogPost.findById(updateData.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(updateData.title);
                    expect(post.content).to.equal(updateData.content);
                })
        });
    });


    describe('DELETE endpoint', function () {
        // strategy:
        //  1. get a post
        //  2. make a DELETE request for that post's id
        //  3. assert that response has right status code
        //  4. prove that restaurant with the id doesn't exist in db anymore
        it('should delete a post by id', function () {

            let post;

            return BlogPost
                .findOne()
                .then(function (_post) {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(function (res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function(_post) {
                    expect(_post).to.be.null;
                })
        });
    });


});

