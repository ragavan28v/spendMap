import { defaultCategories } from '@/constants/categories';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { saveOrQueueCategory } from '@/services/sync/offlineQueue';
import { useUserStore } from '@/store/userStore';
import { Category } from '@/types';
import { create } from 'zustand';

export interface CategoryState {
  categories: Category[];
  initializeCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  getCategoryById: (categoryId: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
    categories: defaultCategories,

    initializeCategories: (categories) => {
      set((state) => ({
        ...state,
        categories: categories.length ? categories : defaultCategories,
      }));
    },

    addCategory: (category) => {
      set((state) => {
        const categories = [...state.categories, category];
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          saveOrQueueCategory(userId, category);
        }
        return {
          ...state,
          categories,
        };
      });
    },

    updateCategory: (category) => {
      set((state) => {
        const categories = state.categories.map((item: Category) =>
          item.id === category.id ? category : item
        );
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          saveOrQueueCategory(userId, category);
        }
        return {
          ...state,
          categories,
        };
      });
    },

    getCategoryById: (categoryId) => {
      return get().categories.find((item) => item.id === categoryId);
    },
  }));

