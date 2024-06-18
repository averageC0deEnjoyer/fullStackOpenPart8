const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { GraphQLError } = require("graphql");

/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 *
 * Spanish:
 * Podría tener más sentido asociar un libro con su autor almacenando la id del autor en el contexto del libro en lugar del nombre del autor
 * Sin embargo, por simplicidad, almacenaremos el nombre del autor en conexión con el libro
 */

/*
  you can remove the placeholder query once your first one has been implemented 
*/

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const Author = require("./models/author");
const Book = require("./models/book");

require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("connecting to", MONGODB_URI);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to mongoDB");
  })
  .catch((err) => {
    console.log("error connecting to mongoDB", err.message);
  });

const typeDefs = `
  type Author {
    name: String!
    born: Int
    id: ID!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]
    id: ID!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    authorCount: Int!
    bookCount: Int!
    allBooks(
      name: String
      genre: String): [Book!]
    allAuthors: [Author!] 
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]
      ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`;

const resolvers = {
  Query: {
    authorCount: async () => Author.collection.countDocuments(),
    bookCount: async () => Book.collection.countDocuments(),
    allBooks: async (root, args) => {
      if (!args.name && !args.genre) return Book.find({}).populate("author");
      if (args.name) {
        const author = await Author.findOne({ name: args.name });
        const bookList = await Book.find({ author: author.id }).populate(
          "author"
        );
        // console.log(bookList);
        return bookList;
      }
      if (args.genre)
        return Book.find({ genres: { $in: [args.genre] } }).populate("author");
    },
    allAuthors: async () => Author.find({}),
  },
  Mutation: {
    addBook: async (root, args) => {
      let authorData = await Author.findOne({ name: args.author });
      console.log(authorData);
      if (!authorData) {
        const newAuthorObj = new Author({ name: args.author });
        try {
          authorData = await newAuthorObj.save();
        } catch (error) {
          throw new GraphQLError("Saving new author failed", {
            extensions: {
              code: "BAD_USER_INPUT",
              invalidArgs: args.author,
              error,
            },
          });
        }
      }
      // console.log("testflow");
      // console.log(authorData);
      // console.log(authorData.id);

      const newBookObj = new Book({ ...args, author: authorData.id });
      try {
        await newBookObj.save();
      } catch (error) {
        throw new GraphQLError("Saving new book failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.title,
            error,
          },
        });
      }

      return newBookObj.populate("author");
    },
    editAuthor: async (root, args) => {
      const currentAuthor = await Author.findOne({ name: args.name });
      let born = currentAuthor?.born;
      born = args.setBornTo;
      try {
        await currentAuthor.save();
      } catch (error) {
        throw new GraphQLError("edit author failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      }
      return currentAuthor;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
