import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
  const storagedCart = localStorage.getItem('@RocketShoes:cart');

  if (storagedCart) {
    return JSON.parse(storagedCart);
  }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(product => product.id === productId);

      if (productAlreadyInCart) {
        const stockResponse = await api.get<Stock>(`/stock/${productId}`);
        const numberOfProductsInStock = stockResponse.data.amount;

        if (numberOfProductsInStock > productAlreadyInCart.amount) {
          const updatedCart = cart.map(product => {
            if(product.id === productId) {
              return {...product, amount: product.amount + 1}
            }

            return product;
          });

          setCart(updatedCart);

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }

      } else {        
        const productResponse = await api.get<Product>(`/products/${productId}`);
        const product = productResponse.data;
        const updatedCart = [...cart, { ...product, amount: 1 }];
        
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));        
      }      

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if (productExists) { 
        const newCart = cart.filter(product => product.id !== productId);
  
        setCart(newCart);
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Erro na remoção do produto');
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) { return; }

      const response = await api.get<Stock>(`/stock/${productId}`);
      const numberOfProductsInStock = response.data.amount;

      if (numberOfProductsInStock < amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const updatedCart = cart.map(product => {
          if (product.id === productId) {
            return {...product, amount: amount}
          }

          return product;
        });
        setCart(updatedCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
