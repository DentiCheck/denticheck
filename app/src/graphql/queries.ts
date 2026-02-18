import { gql } from '@apollo/client';

export const GET_HOSPITALS = gql`
  query GetHospitals {
    hospitals {
      id
      name
      address
      phone
      description
      latitude
      longitude
      homepageUrl
    }
  }
`;

export const SEARCH_HOSPITALS = gql`
  query SearchHospitals($latitude: Float!, $longitude: Float!, $radius: Float, $page: Int, $size: Int) {
    searchHospitals(latitude: $latitude, longitude: $longitude, radius: $radius, page: $page, size: $size) {
      content {
        id
        name
        address
        phone
        description
        latitude
        longitude
        homepageUrl
      }
      pageInfo {
        currentPage
        totalPages
        totalElements
      }
    }
  }
`;

export const GET_POSTS = gql`
  query GetPosts($limit: Int, $offset: Int, $postType: String) {
    posts(limit: $limit, offset: $offset, postType: $postType) {
      id
      author
      authorInitial
      content
      images
      tags {
        type
        name
        id
      }
      likes
      comments
      createdAt
      postType
      isMine
      isLiked
    }
  }
`;

export const GET_POST = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      author
      authorInitial
      content
      images
      tags {
        type
        name
        id
      }
      likes
      comments
      createdAt
      postType
      isMine
      isLiked
    }
  }
`;

export const GET_COMMENTS = gql`
  query GetComments($postId: ID!, $limit: Int, $offset: Int) {
    comments(postId: $postId, limit: $limit, offset: $offset) {
      id
      author
      content
      images
      tags {
        type
        name
        id
      }
      createdAt
      likes
      isLiked
      isMine
      replyCount
    }
  }
`;

export const GET_REPLIES = gql`
  query GetReplies($parentCommentId: ID!) {
    replies(parentCommentId: $parentCommentId) {
      id
      author
      content
      images
      tags {
        type
        name
        id
      }
      createdAt
      likes
      isLiked
      isMine
      replyCount
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      author
      content
      images
      tags {
        type
        name
        id
      }
      createdAt
      likes
      isLiked
      isMine
    }
  }
`;

export const CREATE_REPLY = gql`
  mutation CreateReply($input: CreateReplyInput!) {
    createReply(input: $input) {
      id
      author
      content
      images
      tags {
        type
        name
        id
      }
      createdAt
      likes
      isLiked
      isMine
      replyCount
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;

export const TOGGLE_COMMENT_LIKE = gql`
  mutation ToggleCommentLike($commentId: ID!) {
    toggleCommentLike(commentId: $commentId) {
      id
      likes
      isLiked
    }
  }
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      id
      author
      content
      images
      tags {
        type
        name
        id
      }
      createdAt
      likes
      isLiked
      isMine
    }
  }
`;

export const TOGGLE_POST_LIKE = gql`
  mutation TogglePostLike($postId: ID!) {
    togglePostLike(postId: $postId) {
      isLiked
      likeCount
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id)
  }
`;

export const GET_DENTALS = gql`
  query GetDentals($name: String, $limit: Int) {
    dentals(name: $name, limit: $limit) {
      id
      name
      address
      phone
    }
  }
`;

export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      author
      authorInitial
      content
      images
      tags {
        type
        name
        id
      }
      likes
      comments
      createdAt
      postType
      isMine
      isLiked
    }
  }
`;
