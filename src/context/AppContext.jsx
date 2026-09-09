"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppContextProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const createNewChat = async () => {
    try {
      if (!user) {
        return;
      }

      const token = await getToken();

      const { data } = await axios.post(
        "/api/chat/create",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        const newChat = data.data;

        setChats((prevChats) => [newChat, ...prevChats]);
        setSelectedChat(newChat);

        return newChat;
      }
      console.log('create new chat error', data);
      toast.error(data?.message || "Failed to create chat");
    } catch (error) {
      console.error("createNewChat error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create chat",
      );
    }
  };

  const fetchUsersChats = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get("/api/chat/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        console.log(data.data);
        setChats(data.data);

        // If the user has no chats, create one
        if (data.data.length === 0) {
          await createNewChat();
          return fetchUsersChats();
        } else {
          // sort chats by updated date
          data.data.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
          );

          // set recently updated chat as a selected chat
          setSelectedChat(data.data[0]);
          console.log(data.data[0]);
        }
      } else {
        console.log('fetchUsersChats Error', data);
        toast.error(data.message);
      }
    } catch (error) {
      console.log('fetchUsersChats catch Error', error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsersChats();
    }
  }, [user]);

  const value = {
    user,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    fetchUsersChats,
    createNewChat,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
