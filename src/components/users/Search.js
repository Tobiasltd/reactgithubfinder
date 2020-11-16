import React, { useState, useContext, useEffect } from "react";
import GithubContext from "../../context/github/githubContext";
import AlertContext from "../../context/alert/alertContext";
import axios from "axios";

import { from, BehaviorSubject } from "rxjs";
import {
  filter,
  debounceTime,
  mergeMap,
  distinctUntilChanged,
} from "rxjs/operators";

let githubClientId;
let githubClientSecret;

if (process.env.NODE_ENV !== "production") {
  githubClientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
  githubClientSecret = process.env.REACT_APP_GITHUB_CLIENT_SECRET;
} else {
  githubClientId = process.env.GITHUB_CLIENT_ID;
  githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
}

// Autocomplete User Search
const autoCompleteUsers = async (search) => {
  const res = await axios.get(
    `https://api.github.com/search/users?q=${search}&per_page=8&client_id=${githubClientId}&client_secret=${githubClientSecret}`
  );
  return res.data.items;
};

let searchSubject = new BehaviorSubject("");
let searchResultObservable = searchSubject.pipe(
  // Make sure entered value is longer than 1 character
  filter((val) => val.length > 1),
  // Wait .5s between inputs before emitting value
  debounceTime(500),
  // Only emit new value if it differs from the last emitted value
  distinctUntilChanged(),
  mergeMap((val) => from(autoCompleteUsers(val)))
);

const useObservable = (observable, setter) => {
  useEffect(() => {
    let subscription = observable.subscribe((result) => {
      setter(result);
    });

    return () => subscription.unsubscribe();
  }, [observable, setter]);
};

const Search = () => {
  const githubContext = useContext(GithubContext);
  const alertContext = useContext(AlertContext);
  const { searchUsers, clearUsers, users } = githubContext;
  const { setAlert } = alertContext;

  // Autocomplete
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [autoCompleteActive, setAutoCompleteActive] = useState(false);

  useObservable(searchResultObservable, setResults);

  const onSubmit = (e) => {
    e.preventDefault();
    if (search === "") {
      setAlert("Please enter something", "light");
    } else {
      searchUsers(search);
      setSearch("");
      searchSubject.next("");
    }
  };

  const onChange = (e) => {
    // Take input from searchbar
    const newValue = e.target.value;
    // If input is longer than 0, show the auto complete options
    if (newValue.length > 0) {
      // Set auto complete visibility to true
      setAutoCompleteActive(true);
      // Change the state of "search" to the entered value
      setSearch(newValue);
      // Start observable pipe, whoever is subscribed to this gets the value
      searchSubject.next(newValue);
    } else {
      setAutoCompleteActive(false);
      setSearch(newValue);
      searchSubject.next(newValue);
    }
  };

  const selectAutoComplete = (e) => {
    const autoValue = e.target.id;
    searchUsers(autoValue);
    setSearch("");
    setAutoCompleteActive(false);
  };

  return (
    <div>
      <form autoComplete="off" onSubmit={onSubmit} className="form">
        <div style={autocomplete}>
          <input
            type="text"
            name="text"
            placeholder="Search Users..."
            value={search}
            onChange={onChange}
          />
          {autoCompleteActive && (
            <div style={autocompleteItems}>
              {results.map((user) => (
                <div
                  onClick={selectAutoComplete}
                  style={autocompleteItemsDiv}
                  key={user.login}
                  id={user.login}
                  className="hoverItem"
                >
                  {user.login.substr(0, search.length).toUpperCase() ===
                  search.toUpperCase() ? (
                    <span>
                      <strong>{user.login.substr(0, search.length)}</strong>
                      {user.login.substr(search.length)}
                    </span>
                  ) : (
                    user.login
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          style={{
            display: "inline-block",
            position: "absolute",
            width: "186px",
          }}
          type="submit"
          value="Search"
          className="btn btn-dark"
        />
      </form>
      {users.length > 0 && (
        <button
          style={{ width: "100%", marginTop: "1rem" }}
          className="btn btn-dark btn-block"
          onClick={clearUsers}
        >
          Clear
        </button>
      )}
    </div>
  );
};

//Styles
const autocomplete = {
  /*the container must be positioned relative:*/
  position: "relative",
  display: "inline-block",
  width: "850px",
};

const autocompleteItems = {
  border: "1px solid #d4d4d4",
  borderBottom: "none",
  borderTop: "none",
  zIndex: "99",
  /*position the autocomplete items to be the same width as the container:*/
  width: "100%",
  top: "100%",
  left: "0",
  right: "0",
};

const autocompleteItemsDiv = {
  padding: "10px",
  cursor: "pointer",
  backgroundColor: "#fff",
  borderBottom: "1px solid #d4d4d4",
};

export default Search;
