// Import des dépendances
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import mongoose from 'mongoose'

await mongoose.connect('mongodb://localhost:27017/delivecrous')

const Dish = mongoose.model('Dish', {
    name: String,
    description: String,
    price: Number,
    urlImage: String
  })

  const basketSchema = new mongoose.Schema({
    dishIds: [String], // Liste des IDs des plats
    totalPrice: Number, // Total des prix des plats du panier
    isConfirmed: Boolean, // Indicateur pour vérifier si le panier est validé
    itemCount: Number, // Nombre d'éléments dans le panier
    deliveryAddress: String // Adresse de livraison du panier
  });
  const Basket = mongoose.model('Basket', basketSchema);

// Nous verrons plus tard ce que sont les typeDefs et resolvers
const typeDefs = `#graphql
   type Dish {
    id: ID!
    name: String,
    description: String,
    price: Int,
    urlImage: String
  }

  type Basket{
    id: ID!
    dishIds:[String],
    totalPrice: Int,
    isConfirmed: Boolean,
    itemCount: Int,
    deliveryAddress: String
  }

  type Query {
    #dish
    dishes: [Dish]
    dish(id: ID!): Dish

    #basket
    baskets:[Basket] 
    basket(id:ID!): Basket
  }

  type Mutation {
    #dish
    addDish(name: String, description: String, price: Int, urlImage: String): Dish

    updateDish(id: ID!, name: String, description: String, price: Int, urlImage: String): Dish

    deleteDish(id: ID!): Dish

    #basket

    initBasket: Basket
    addDishToBasket(basketid: ID!, dishId: ID ): Basket
    removeDishFromBasket(basketId: ID, dishId: ID): Basket
    updateDeliveryAddress(basketId: ID, deliveryAddress: String): Basket
  }
`

// On laisse l'objet vide pour le moment
const resolvers = {
    Query: {
        //dish
        dishes: async () => {
          return await Dish.find()
        },
        dish: async (parent, args) => {
          const { id } = args
          const dish = await Dish.findById(id)
          return dish
        },

        //Basket

        baskets: async () => {
            return await Basket.find()
          },
        basket:  async (parent, args) => {
            const { id } = args
            const basket = await Basket.findById(id)
            return basket
          },
      },

      Mutation: {
        //dish
        addDish: async (parent, args) => {
          const { name, description, price, urlImage } = args
          const newDish = new Dish({
            name,
            description,
            price,
            urlImage,
          })
          await newDish.save()
          return newDish;
        },
        updateDish: async (parent, args) => {
            const { id, name, description, price, urlImage } = args
            const dish = await Dish.findOneAndUpdate(
              { _id: id },
              {
                name,
                description,
                price,
                urlImage,
              },
              { new: true }
            )
      
            return dish;
        },
        deleteDish: async (parent, args) => {
        const { id } = args
        const dish = await Dish.findOneAndDelete({ _id: id })
        return dish;
        },

        //Basket

        /*initBasket: async (parent, args) => {
            return await Basket.Create();
        },*/

        initBasket: async (parent, args) => {
            try {
              // Création d'un nouveau panier
              const newBasket = new Basket({
                dishIds: [],
                totalPrice: 0,
                isConfirmed: false,
                itemCount: 0
              });
      
              // Sauvegarde du panier dans la base de données
              const savedBasket = await newBasket.save();
      
              return savedBasket;
            } catch (error) {
              throw new Error('Erreur lors de l\'initialisation du panier');
            }
          },

        addDishToBasket: async (parent, args) => {
            const {basketid, dishId} = args;
            try {
                // Recherche du panier par ID
                const basket = await Basket.findById(basketid);
        
                // Vérification si le panier existe
                if (!basket) {
                  throw new Error('Panier non trouvé');
                }
        
                // Ajout du dishId au panier
                basket.dishIds.push(dishId);
        
                // Mise à jour du totalPrice et itemCount (selon vos besoins spécifiques)
                const dish = await Dish.findById(dishId); // Supposons que vous ayez un modèle "Dish" pour les plats
                if (dish) {
                basket.totalPrice += dish.price;
                }

                // Mise à jour du itemCount
                basket.itemCount = basket.dishIds.length;

                // Sauvegarde des modifications du panier dans la base de données
                const updatedBasket = await basket.save();
        
                return updatedBasket;
            }catch (error) {
            throw new Error('Erreur lors de l\'ajout du plat au panier');
            }
        },

        removeDishFromBasket: async (parent, args) => {
            const { basketId, dishId } = args;
            try {
                // Recherche du panier par ID
                const basket = await Basket.findById(basketId);
        
                // Vérification si le panier existe
                if (!basket) {
                  throw new Error('Panier non trouvé');
                }
        
                // Vérification si le plat existe dans le panier
                if (!basket.dishIds.includes(dishId)) {
                  throw new Error('Plat non trouvé dans le panier');
                }
        
                // Suppression du dishId du panier
                basket.dishIds = basket.dishIds.filter((id) => id !== dishId);
        
                // Mise à jour du totalPrice en fonction du prix du plat supprimé
                const dish = await Dish.findById(dishId);
                if (dish) {
                  basket.totalPrice -= dish.price;
                }

                // Mise à jour du itemCount
                basket.itemCount = basket.dishIds.length;

                // Sauvegarde des modifications du panier dans la base de données
                const updatedBasket = await basket.save();

                return updatedBasket;
            } catch (error) {
                throw new Error('Erreur lors de la suppression du plat du panier');
            }
        }, 
        updateDeliveryAddress: async (parent, args) => {
            const { basketId, deliveryAddress } = args;
            try {
                // Recherche du panier par ID
                const basket = await Basket.findById(basketId);
        
                // Vérification si le panier existe
                if (!basket) {
                  throw new Error('Panier non trouvé');
                }
        
                // Mise à jour de l'adresse de livraison
                basket.deliveryAddress = deliveryAddress;
        
                // Sauvegarde des modifications du panier dans la base de données
                const updatedBasket = await basket.save();
        
                return updatedBasket;
              } catch (error) {
                throw new Error('Erreur lors de la mise à jour de l\'adresse de livraison du panier');
              }
        }


        },
}

// Création de l'instance Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
})

// Démarrage du serveur
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
})

// Message de confirmation que le serveur est bien lancé
console.log(`🚀  Le serveur tourne sur: ${url}`)