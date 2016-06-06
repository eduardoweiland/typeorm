import "reflect-metadata";
import * as chai from "chai";
import {expect} from "chai";
import {Post} from "./entity/Post";
import {Category} from "./entity/Category";
import {setupTestingConnections, closeConnections, reloadDatabases, createTestingConnectionOptions} from "../../utils/utils";
import {Connection} from "../../../src/connection/Connection";
import {CannotConnectAlreadyConnectedError} from "../../../src/connection/error/CannotConnectAlreadyConnectedError";
import {CannotCloseNotConnectedError} from "../../../src/connection/error/CannotCloseNotConnectedError";
import {CannotImportAlreadyConnectedError} from "../../../src/connection/error/CannotImportAlreadyConnectedError";
import {Repository} from "../../../src/repository/Repository";
import {TreeRepository} from "../../../src/repository/TreeRepository";
import {ReactiveRepository} from "../../../src/repository/ReactiveRepository";
import {ReactiveTreeRepository} from "../../../src/repository/ReactiveTreeRepository";
import {getConnectionManager} from "../../../src/index";
import {CreateConnectionOptions} from "../../../src/connection-manager/CreateConnectionOptions";

chai.should();
chai.use(require("sinon-chai"));
chai.use(require("chai-as-promised"));

describe("Connection", () => {

    describe("before connection is established", function() {

        let connection: Connection;
        before(async () => {
            const options: CreateConnectionOptions = {
                driver: "mysql",
                connection: createTestingConnectionOptions("mysql"),
                entities: []
            };
            connection = await getConnectionManager().create(options);
        });

        it("connection.isConnected should be false", () => {
            connection.isConnected.should.be.false;
        });

        it("import entities, entity schemas, subscribers and naming strategies should work", () => () => {
            connection.importEntities([Post]).should.be.fulfilled;
            connection.importSchemas([]).should.be.fulfilled;
            connection.importSubscribers([]).should.be.fulfilled;
            connection.importNamingStrategies([]).should.be.fulfilled;
            connection.importEntitiesFromDirectories([]).should.be.fulfilled;
            connection.importEntitySchemaFromDirectories([]).should.be.fulfilled;
            connection.importSubscribersFromDirectories([]).should.be.fulfilled;
            connection.importNamingStrategiesFromDirectories([]).should.be.fulfilled;
        });

        it("should not be able to connect", () => () => {
            connection.connect().should.be.fulfilled;
        });

        it("should be able to close a connection", () => () => {
            connection.close().should.be.fulfilled;
        });

    });

    describe("after connection is established successfully", function() {

        let connections: Connection[];
        before(() => setupTestingConnections({ entities: [Post, Category] }).then(all => connections = all));
        beforeEach(() => reloadDatabases(connections));

        it("connection.isConnected should be true", () => connections.forEach(connection => {
            connection.isConnected.should.be.true;
        }));

        it("import entities, entity schemas, subscribers and naming strategies should not be possible once connection is done", () => connections.forEach(connection => {
            connection.importEntities([Post]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importSchemas([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importSubscribers([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importNamingStrategies([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importEntitiesFromDirectories([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importEntitySchemaFromDirectories([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importSubscribersFromDirectories([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
            connection.importNamingStrategiesFromDirectories([]).should.be.rejectedWith(CannotImportAlreadyConnectedError);
        }));

        it("should not be able to connect again", () => connections.forEach(connection => {
            connection.connect().should.be.rejectedWith(CannotConnectAlreadyConnectedError);
        }));

        it("should be able to close a connection", () => connections.forEach(connection => {
            connection.close().should.be.fulfilled;
        }));

    });

    describe("working with repositories after connection is established successfully", function() {

        let connections: Connection[];
        before(() => setupTestingConnections({ entities: [Post, Category] }).then(all => connections = all));
        after(() => closeConnections(connections));
        beforeEach(() => reloadDatabases(connections));

        it("should be able to get simple entity repository", () => connections.forEach(connection => {
            connection.getRepository(Post).should.be.instanceOf(Repository);
            connection.getRepository(Post).should.not.be.instanceOf(TreeRepository);
            connection.getRepository(Post).target.should.be.eql(Post);
        }));

        it("should be able to get tree entity repository", () => connections.forEach(connection => {
            connection.getTreeRepository(Category).should.be.instanceOf(TreeRepository);
            connection.getTreeRepository(Category).target.should.be.eql(Category);
        }));

        it("should be able to get simple entity reactive repository", () => connections.forEach(connection => {
            connection.getReactiveRepository(Post).should.be.instanceOf(ReactiveRepository);
            connection.getReactiveRepository(Post).should.not.be.instanceOf(ReactiveTreeRepository);
            connection.getReactiveRepository(Post).target.should.be.eql(Post);
        }));

        it("should be able to get tree entity reactive repository", () => connections.forEach(connection => {
            connection.getReactiveTreeRepository(Category).should.be.instanceOf(ReactiveTreeRepository);
            connection.getReactiveTreeRepository(Category).target.should.be.eql(Category);
        }));

    });

    describe("generate a schema when connection.syncSchema is called", function() {

        let connections: Connection[];
        before(() => setupTestingConnections({ entities: [Post] }).then(all => connections = all));
        after(() => closeConnections(connections));

        it("database should be empty after schema is synced with dropDatabase flag", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const post = new Post();
            post.title = "new post";
            await postRepository.persist(post);
            const loadedPost = await postRepository.findOneById(post.id);
            expect(loadedPost).to.be.eql(post);
            await connection.syncSchema(true);
            const againLoadedPost = postRepository.findOneById(post.id);
            expect(againLoadedPost).to.be.empty;
        })));

    });

    describe("after connection is closed successfully", function() {

        // open a close connections
        let connections: Connection[] = [];
        before(() => setupTestingConnections({ entities: [Post] }).then(all => {
            connections = all;
            return Promise.all(connections.map(connection => connection.close()));
        }));
        
        it("should not be able to close already closed connection", () => connections.forEach(connection => {
            connection.close().should.be.rejectedWith(CannotCloseNotConnectedError);
        }));

        it("connection.isConnected should be false", () => connections.forEach(connection => {
            connection.isConnected.should.be.false;
        }));

    });
    
});