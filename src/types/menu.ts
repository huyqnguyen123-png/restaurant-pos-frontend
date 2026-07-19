export interface MenuItem {
  id: number;
  name: string;
  price: number;
  createdAt: string;
}

export interface MenuItemFormInput {
  name: string;
  price: string; // kept as string while editing in a TextInput, converted to number before sending
}